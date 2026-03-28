use crate::models::{
    config::{EngineConfig, ReviewProfile},
    engine::{RawReview},
    pr::PullRequest,
    review::{PRReview, ReviewIssue},
};
use crate::commands::keychain::get_api_key_internal;
use crate::diff::{extractor::extract_hunk_for_line, parser::parse_diff};
use tauri::Emitter;
use tauri_plugin_shell::ShellExt;
use tracing::{error, info, warn};

const MAX_DIFF_CHARS: usize = 60_000;

/// Truncate a unified diff to stay within MAX_DIFF_CHARS.
/// Keeps as many complete file diffs as possible; appends a truncation notice.
fn truncate_diff(diff: &str) -> (String, bool) {
    if diff.len() <= MAX_DIFF_CHARS {
        return (diff.to_string(), false);
    }
    let mut out = String::with_capacity(MAX_DIFF_CHARS);
    let mut truncated = false;
    let mut file_count = 0usize;
    let mut skipped = 0usize;

    // Split on file headers (lines starting with "diff --git" or "---")
    let mut current_file = String::new();
    for line in diff.lines() {
        if line.starts_with("diff --git") {
            // Flush previous file block if it fits
            if !current_file.is_empty() {
                if out.len() + current_file.len() <= MAX_DIFF_CHARS {
                    out.push_str(&current_file);
                    file_count += 1;
                } else {
                    skipped += 1;
                    truncated = true;
                }
            }
            current_file = format!("{line}\n");
        } else {
            current_file.push_str(line);
            current_file.push('\n');
        }
    }
    // Flush final file
    if !current_file.is_empty() {
        if out.len() + current_file.len() <= MAX_DIFF_CHARS {
            out.push_str(&current_file);
            file_count += 1;
        } else {
            skipped += 1;
            truncated = true;
        }
    }

    if truncated {
        out.push_str(&format!(
            "\n// [DiffOrbit: diff truncated — showed {file_count} files, omitted {skipped} files to stay within context limit]\n"
        ));
    }
    (out, truncated)
}

fn build_prompt(pr: &PullRequest, profile: &ReviewProfile, _engine_label: &str) -> (String, bool) {
    let (diff_text, was_truncated) = truncate_diff(&pr.diff);
    let file_list: Vec<&str> = pr.files.iter().take(20).map(|s| s.as_str()).collect();
    let file_list_str = file_list.join(", ");
    let files_changed = pr.files.len().to_string();

    let prompt = profile.system_prompt
        .replace("{repo}", &pr.repo)
        .replace("{number}", &pr.number.to_string())
        .replace("{title}", &pr.title)
        .replace("{author}", &pr.author)
        .replace("{url}", &pr.url)
        .replace("{files_changed}", &files_changed)
        .replace("{file_list}", &file_list_str)
        .replace("{diff}", &diff_text);

    (prompt, was_truncated)
}

fn extract_json(raw: &str) -> Result<RawReview, String> {
    // Find first '{' and last '}'
    let start = raw.find('{').ok_or("no JSON found in response")?;
    let end = raw.rfind('}').ok_or("no closing brace in response")?;
    let json_str = &raw[start..=end];
    serde_json::from_str(json_str).map_err(|e| format!("JSON parse error: {e}\nRaw: {json_str}"))
}

async fn call_anthropic(
    app: &tauri::AppHandle,
    prompt: &str,
    engine: &EngineConfig,
) -> Result<String, String> {
    let api_key = get_api_key_internal(app, "difforbit.anthropic")
        .ok_or("Anthropic API key not set — save it in Configuration → AI Engine")?;

    info!(model = %engine.model, prompt_chars = prompt.len(), "calling Anthropic API");

    let client = reqwest::Client::new();
    let body = serde_json::json!({
        "model": engine.model,
        "max_tokens": engine.max_tokens,
        "messages": [{"role": "user", "content": prompt}]
    });

    let resp = client
        .post("https://api.anthropic.com/v1/messages")
        .header("x-api-key", &api_key)
        .header("anthropic-version", "2023-06-01")
        .header("content-type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| {
            error!(err = %e, "Anthropic HTTP request failed");
            e.to_string()
        })?;

    let status = resp.status();
    info!(status = %status, "Anthropic response received");

    let json: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;

    if let Some(err) = json.get("error") {
        let msg = format!("Anthropic API error: {err}");
        error!("{}", msg);
        return Err(msg);
    }

    let text = json["content"][0]["text"]
        .as_str()
        .map(|s| s.to_string())
        .ok_or_else(|| {
            let msg = format!("unexpected Anthropic response shape: {json}");
            error!("{}", msg);
            msg
        })?;

    info!(response_chars = text.len(), "Anthropic response parsed");
    Ok(text)
}

async fn call_openai_compat(
    app: &tauri::AppHandle,
    prompt: &str,
    engine: &EngineConfig,
) -> Result<String, String> {
    let api_key = get_api_key_internal(app, "difforbit.openai")
        .ok_or("OpenAI-compatible API key not set — save it in Configuration → AI Engine")?;
    let base_url = engine.base_url.as_deref().unwrap_or("https://api.openai.com/v1");
    let url = format!("{base_url}/chat/completions");

    info!(model = %engine.model, url = %url, prompt_chars = prompt.len(), "calling OpenAI-compat API");

    let client = reqwest::Client::new();
    let body = serde_json::json!({
        "model": engine.model,
        "max_tokens": engine.max_tokens,
        "temperature": engine.temperature,
        "messages": [{"role": "user", "content": prompt}]
    });

    let resp = client
        .post(&url)
        .bearer_auth(&api_key)
        .header("content-type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| {
            error!(url = %url, err = %e, "OpenAI-compat HTTP request failed");
            e.to_string()
        })?;

    let status = resp.status();
    info!(status = %status, "OpenAI-compat response received");

    let json: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;

    if let Some(err) = json.get("error") {
        let msg = format!("OpenAI-compat API error: {err}");
        error!("{}", msg);
        return Err(msg);
    }

    let text = json["choices"][0]["message"]["content"]
        .as_str()
        .map(|s| s.to_string())
        .ok_or_else(|| {
            let msg = format!("unexpected OpenAI-compat response shape: {json}");
            error!("{}", msg);
            msg
        })?;

    info!(response_chars = text.len(), "OpenAI-compat response parsed");
    Ok(text)
}

fn claude_bin() -> String {
    for candidate in &[
        "/opt/homebrew/bin/claude",
        "/usr/local/bin/claude",
        "/usr/bin/claude",
    ] {
        if std::path::Path::new(candidate).exists() {
            return candidate.to_string();
        }
    }
    // npm global installs land in ~/.npm-global/bin or $(npm prefix -g)/bin
    if let Ok(home) = std::env::var("HOME") {
        let npm_global = format!("{home}/.npm-global/bin/claude");
        if std::path::Path::new(&npm_global).exists() {
            return npm_global;
        }
        // nvm / volta style
        let local_bin = format!("{home}/.local/bin/claude");
        if std::path::Path::new(&local_bin).exists() {
            return local_bin;
        }
    }
    "claude".to_string()
}

async fn call_claude_code(
    app: &tauri::AppHandle,
    prompt: &str,
) -> Result<String, String> {
    let shell = app.shell();
    let claude = claude_bin();
    info!(claude = %claude, prompt_chars = prompt.len(), "calling claude CLI");
    let output = shell
        .command(&claude)
        .args(["-p", prompt])
        .output()
        .await
        .map_err(|e| {
            error!(claude = %claude, err = %e, "claude CLI spawn failed");
            e.to_string()
        })?;

    if output.status.success() {
        let text = String::from_utf8_lossy(&output.stdout).to_string();
        info!(response_chars = text.len(), "claude CLI returned");
        Ok(text)
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
        error!(stderr = %stderr, "claude CLI returned non-zero exit");
        Err(stderr)
    }
}

pub async fn run_engine(
    app: &tauri::AppHandle,
    pr: &PullRequest,
    profile: &ReviewProfile,
    engine: &EngineConfig,
) -> Result<PRReview, String> {
    let engine_label = format!("{}/{}", engine.r#type, engine.model);
    let (prompt, diff_truncated) = build_prompt(pr, profile, &engine_label);
    info!(
        pr = pr.number, engine = %engine_label, profile = %profile.name,
        prompt_chars = prompt.len(), diff_truncated, "prompt built"
    );

    if diff_truncated {
        warn!(pr = pr.number, "diff was truncated to fit context limit");
        let _ = app.emit("review:warning", serde_json::json!({
            "pr_number": pr.number,
            "message": "Diff was truncated to fit context limit — some files were omitted"
        }));
    }

    info!(pr = pr.number, engine = %engine.r#type, "dispatching to engine");
    let raw = match engine.r#type.as_str() {
        "anthropic" => call_anthropic(app, &prompt, engine).await?,
        "openai_compatible" => call_openai_compat(app, &prompt, engine).await?,
        "claude_code" => call_claude_code(app, &prompt).await?,
        t => return Err(format!("unknown engine type: {t}")),
    };
    info!(pr = pr.number, raw_chars = raw.len(), "engine returned raw output");

    let raw_review = extract_json(&raw).map_err(|e| {
        error!(pr = pr.number, err = %e, raw = %&raw[..raw.len().min(500)], "JSON parse failed");
        e
    })?;

    // Build diff map
    let diff_map = parse_diff(&pr.diff);

    // Map raw issues → ReviewIssue with diff hunks
    let issues = raw_review.issues.into_iter().map(|ri| {
        let diff_hunk = match (&ri.file, ri.line) {
            (Some(f), Some(l)) => {
                let hunk = extract_hunk_for_line(&pr.diff, f, l, 5);
                if hunk.is_empty() { None } else { Some(hunk) }
            }
            _ => None,
        };
        let auto_selected = matches!(ri.severity.as_str(), "High" | "Medium");
        ReviewIssue {
            file: ri.file,
            line: ri.line,
            description: ri.description,
            severity: ri.severity,
            category: ri.category,
            suggested_comment: ri.suggested_comment,
            selected: auto_selected,
            diff_hunk,
        }
    }).collect();

    let now = chrono::Utc::now().to_rfc3339();

    Ok(PRReview {
        pr: pr.clone(),
        verdict: raw_review.verdict,
        summary: raw_review.summary,
        issues,
        positive_notes: raw_review.positive_notes,
        overall_notes: raw_review.overall_notes,
        reviewed_at: now,
        engine: engine_label,
        diff_map,
        commit_sha: pr.head_sha.clone(),
    })
}
