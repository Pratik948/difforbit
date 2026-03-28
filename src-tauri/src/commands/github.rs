use crate::models::{config::RepoConfig, pr::PullRequest};
use serde::Deserialize;
use tauri_plugin_shell::ShellExt;
use tracing::{debug, error, info};

/// Resolve the `gh` binary path. Tauri's shell does not inherit the user's PATH,
/// so we probe known Homebrew / system locations before falling back to bare "gh".
fn gh_bin() -> String {
    for candidate in &[
        "/opt/homebrew/bin/gh",   // Apple Silicon Homebrew
        "/usr/local/bin/gh",      // Intel Homebrew
        "/usr/bin/gh",
    ] {
        if std::path::Path::new(candidate).exists() {
            return candidate.to_string();
        }
    }
    "gh".to_string()
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct GhPrItem {
    number: u32,
    title: String,
    #[serde(default)]
    url: String,
    #[serde(rename = "headRefOid", default)]
    head_ref_oid: String,
    #[serde(rename = "updatedAt", default)]
    updated_at: String,
    author: Option<GhAuthor>,
    files: Option<Vec<GhFile>>,
}

#[derive(Debug, Deserialize)]
struct GhAuthor {
    login: String,
}

#[derive(Debug, Deserialize)]
struct GhFile {
    path: String,
}

#[tauri::command]
pub async fn check_gh_auth(app: tauri::AppHandle) -> Result<String, String> {
    let shell = app.shell();
    let gh = gh_bin();
    info!(gh = %gh, "checking gh auth");
    let output = shell
        .command(&gh)
        .args(["auth", "status", "--json", "activeToken"])
        .output()
        .await
        .map_err(|e| e.to_string())?;

    if output.status.success() {
        // Try to get the username
        let user_out = shell
            .command(&gh)
            .args(["api", "user", "--jq", ".login"])
            .output()
            .await
            .map_err(|e| e.to_string())?;
        let user = String::from_utf8_lossy(&user_out.stdout).trim().to_string();
        Ok(if user.is_empty() { "authenticated".to_string() } else { user })
    } else {
        Err(String::from_utf8_lossy(&output.stderr).trim().to_string())
    }
}

#[tauri::command]
pub async fn list_pending_prs(
    app: tauri::AppHandle,
    repos: Vec<RepoConfig>,
) -> Result<Vec<PullRequest>, String> {
    let shell = app.shell();
    let gh = gh_bin();
    let mut all_prs = Vec::new();

    for repo_cfg in repos.iter().filter(|r| r.enabled) {
        let repo = format!("{}/{}", repo_cfg.owner, repo_cfg.repo);
        info!(repo = %repo, "running gh pr list");
        let output = shell
            .command(&gh)
            .args([
                "pr", "list",
                "--repo", &repo,
                "--search", "review-requested:@me",
                "--state", "open",
                "--json", "number,title,author,url,updatedAt,headRefOid,files",
            ])
            .output()
            .await
            .map_err(|e| e.to_string())?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
            error!(repo = %repo, stderr = %stderr, "gh pr list failed");
            return Err(format!("gh pr list failed for {repo}: {stderr}"));
        }

        let raw = String::from_utf8_lossy(&output.stdout);
        debug!(repo = %repo, raw = %raw, "gh pr list raw output");
        let items: Vec<GhPrItem> = serde_json::from_str(&raw).unwrap_or_default();
        info!(repo = %repo, count = items.len(), "parsed PR list");

        for item in items {
            all_prs.push(PullRequest {
                number: item.number,
                title: item.title,
                author: item.author.map(|a| a.login).unwrap_or_default(),
                url: item.url,
                repo: repo.clone(),
                updated_at: item.updated_at,
                diff: String::new(), // fetched separately
                files: item.files.unwrap_or_default().into_iter().map(|f| f.path).collect(),
                head_sha: item.head_ref_oid,
            });
        }
    }

    Ok(all_prs)
}

#[tauri::command]
pub async fn fetch_pr_diff(
    app: tauri::AppHandle,
    repo: String,
    number: u32,
) -> Result<String, String> {
    let shell = app.shell();
    let gh = gh_bin();
    info!(pr = number, repo = %repo, "running gh pr diff");
    let output = shell
        .command(&gh)
        .args(["pr", "diff", &number.to_string(), "--repo", &repo])
        .output()
        .await
        .map_err(|e| e.to_string())?;

    if output.status.success() {
        let diff = String::from_utf8_lossy(&output.stdout).to_string();
        info!(pr = number, bytes = diff.len(), "diff fetched successfully");
        Ok(diff)
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
        error!(pr = number, repo = %repo, stderr = %stderr, "gh pr diff failed");
        Err(stderr)
    }
}

#[derive(serde::Serialize, serde::Deserialize)]
pub struct CommentData {
    pub path: String,
    pub position: u32,
    pub body: String,
}

#[derive(serde::Serialize)]
pub struct PostResult {
    pub posted: usize,
    pub failed: usize,
}

#[tauri::command]
pub async fn post_inline_comments(
    app: tauri::AppHandle,
    repo: String,
    number: u32,
    comments: Vec<CommentData>,
    commit_sha: String,
) -> Result<PostResult, String> {
    if comments.is_empty() {
        return Ok(PostResult { posted: 0, failed: 0 });
    }

    let shell = app.shell();
    let gh = gh_bin();

    // Build review body with inline comments
    let comments_json: Vec<serde_json::Value> = comments.iter().map(|c| {
        serde_json::json!({
            "path": c.path,
            "position": c.position,
            "body": c.body,
        })
    }).collect();

    let body = serde_json::json!({
        "commit_id": commit_sha,
        "event": "COMMENT",
        "comments": comments_json,
    });

    let (owner, repo_name) = repo.split_once('/').ok_or("invalid repo format")?;
    let endpoint = format!("repos/{owner}/{repo_name}/pulls/{number}/reviews");

    // Write body to a temp file and pass as --input
    let tmp = std::env::temp_dir().join(format!("difforbit_review_{number}.json"));
    std::fs::write(&tmp, body.to_string()).map_err(|e| e.to_string())?;
    let tmp_str = tmp.to_string_lossy().to_string();

    let output = shell
        .command(&gh)
        .args(["api", "--method", "POST", &endpoint, "--input", &tmp_str])
        .output()
        .await;

    let _ = std::fs::remove_file(&tmp);

    match output {
        Ok(o) if o.status.success() => Ok(PostResult { posted: comments.len(), failed: 0 }),
        _ => Ok(PostResult { posted: 0, failed: comments.len() }),
    }
}

#[tauri::command]
pub async fn approve_pr(
    app: tauri::AppHandle,
    repo: String,
    number: u32,
) -> Result<(), String> {
    let shell = app.shell();
    let gh = gh_bin();
    let output = shell
        .command(&gh)
        .args(["pr", "review", &number.to_string(), "--repo", &repo, "--approve"])
        .output()
        .await
        .map_err(|e| e.to_string())?;

    if output.status.success() {
        Ok(())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

#[tauri::command]
pub async fn request_changes(
    app: tauri::AppHandle,
    repo: String,
    number: u32,
    body: String,
) -> Result<(), String> {
    let shell = app.shell();
    let gh = gh_bin();
    let output = shell
        .command(&gh)
        .args([
            "pr", "review", &number.to_string(),
            "--repo", &repo,
            "--request-changes",
            "--body", &body,
        ])
        .output()
        .await
        .map_err(|e| e.to_string())?;

    if output.status.success() {
        Ok(())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}
