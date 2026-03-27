use crate::models::{
    config::{EngineConfig, ReviewProfile},
    engine::{RawReview},
    pr::PullRequest,
    review::{PRReview, ReviewIssue},
};
use crate::commands::keychain::get_api_key_internal;
use crate::diff::{extractor::extract_hunk_for_line, parser::parse_diff};
use tauri::Manager;
use tauri_plugin_shell::ShellExt;

fn build_prompt(pr: &PullRequest, profile: &ReviewProfile, engine_label: &str) -> String {
    format!(
        "{}\n\n\
        ## PR to Review\n\
        Repository: {}\n\
        PR #{}: {}\n\
        Author: {}\n\
        Files changed: {}\n\n\
        ## Diff\n\
        ```diff\n{}\n```\n\n\
        ## Instructions\n\
        Return ONLY raw JSON (no markdown fences, no extra text) matching this exact schema:\n\
        {{\n\
          \"verdict\": \"APPROVE | REQUEST_CHANGES | NEEDS_DISCUSSION\",\n\
          \"summary\": \"2-3 sentence summary\",\n\
          \"issues\": [{{\n\
            \"file\": \"exact path or null\",\n\
            \"line\": 123,\n\
            \"description\": \"...\",\n\
            \"severity\": \"High | Medium | Low | NEEDS_VERIFICATION\",\n\
            \"category\": \"Code Quality | Logic | Stability | Performance | Security | Best Practices\",\n\
            \"suggested_comment\": \"...\"\n\
          }}],\n\
          \"positive_notes\": [\"...\"],\n\
          \"overall_notes\": \"...\"\n\
        }}\n\
        Engine: {}",
        profile.system_prompt,
        pr.repo, pr.number, pr.title, pr.author,
        pr.files.join(", "),
        pr.diff,
        engine_label,
    )
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
        .ok_or("Anthropic API key not set")?;

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
        .map_err(|e| e.to_string())?;

    let json: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;
    json["content"][0]["text"]
        .as_str()
        .map(|s| s.to_string())
        .ok_or_else(|| format!("unexpected Anthropic response: {json}"))
}

async fn call_openai_compat(
    app: &tauri::AppHandle,
    prompt: &str,
    engine: &EngineConfig,
) -> Result<String, String> {
    let api_key = get_api_key_internal(app, "difforbit.openai")
        .ok_or("OpenAI-compatible API key not set")?;
    let base_url = engine.base_url.as_deref().unwrap_or("https://api.openai.com/v1");
    let url = format!("{base_url}/chat/completions");

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
        .map_err(|e| e.to_string())?;

    let json: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;
    json["choices"][0]["message"]["content"]
        .as_str()
        .map(|s| s.to_string())
        .ok_or_else(|| format!("unexpected OpenAI response: {json}"))
}

async fn call_claude_code(
    app: &tauri::AppHandle,
    prompt: &str,
) -> Result<String, String> {
    let shell = app.shell();
    let output = shell
        .command("claude")
        .args(["-p", prompt])
        .output()
        .await
        .map_err(|e| e.to_string())?;

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

pub async fn run_engine(
    app: &tauri::AppHandle,
    pr: &PullRequest,
    profile: &ReviewProfile,
    engine: &EngineConfig,
) -> Result<PRReview, String> {
    let engine_label = format!("{}/{}", engine.r#type, engine.model);
    let prompt = build_prompt(pr, profile, &engine_label);

    let raw = match engine.r#type.as_str() {
        "anthropic" => call_anthropic(app, &prompt, engine).await?,
        "openai_compatible" => call_openai_compat(app, &prompt, engine).await?,
        "claude_code" => call_claude_code(app, &prompt).await?,
        t => return Err(format!("unknown engine type: {t}")),
    };

    let raw_review = extract_json(&raw)?;

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
