use crate::commands::{config::get_config, engines::run_engine, github::{fetch_pr_diff, fetch_pr_info, approve_pr, request_changes, post_inline_comments, CommentData}};
use crate::models::review::{Report, ReportMeta};
use std::collections::HashMap;
use std::sync::Arc;
use tauri::{Emitter, Manager};
use tauri_plugin_notification::NotificationExt;
use tokio::sync::Semaphore;
use tracing::{error, info};

fn notify(app: &tauri::AppHandle, title: &str, body: &str) {
    let _ = app.notification()
        .builder()
        .title(title)
        .body(body)
        .show();
}

fn reports_dir(app: &tauri::AppHandle) -> std::path::PathBuf {
    app.path().app_data_dir().unwrap().join("reports")
}

fn seen_path(app: &tauri::AppHandle) -> std::path::PathBuf {
    app.path().app_data_dir().unwrap().join("seen.json")
}

#[derive(serde::Serialize, serde::Deserialize, Clone, Default)]
struct SeenEntry {
    updated_at: String,
    head_sha: String,
    files: Vec<String>,
}

type SeenMap = HashMap<String, HashMap<String, SeenEntry>>;

fn load_seen(app: &tauri::AppHandle) -> SeenMap {
    let path = seen_path(app);
    if !path.exists() { return HashMap::new(); }
    let data = std::fs::read_to_string(&path).unwrap_or_default();
    // Support both old String format and new SeenEntry format
    if let Ok(map) = serde_json::from_str::<SeenMap>(&data) {
        return map;
    }
    // Migrate old format: HashMap<String, HashMap<String, String>>
    if let Ok(old) = serde_json::from_str::<HashMap<String, HashMap<String, String>>>(&data) {
        let mut new_map = SeenMap::new();
        for (repo, prs) in old {
            let mut pr_map = HashMap::new();
            for (num, updated_at) in prs {
                pr_map.insert(num, SeenEntry { updated_at, ..Default::default() });
            }
            new_map.insert(repo, pr_map);
        }
        return new_map;
    }
    HashMap::new()
}

fn save_seen(app: &tauri::AppHandle, seen: &SeenMap) {
    let path = seen_path(app);
    if let Some(parent) = path.parent() {
        let _ = std::fs::create_dir_all(parent);
    }
    if let Ok(data) = serde_json::to_string(seen) {
        let _ = std::fs::write(&path, data);
    }
}

#[tauri::command]
pub async fn trigger_run_now(app: tauri::AppHandle) -> Result<(), String> {
    run_review_session(app, false, false).await
}

#[tauri::command]
pub async fn trigger_review_changed_files(app: tauri::AppHandle) -> Result<(), String> {
    run_review_session(app, false, true).await
}

#[tauri::command]
pub async fn trigger_force_run(app: tauri::AppHandle) -> Result<(), String> {
    run_review_session(app, true, false).await
}

pub async fn run_review_session(app: tauri::AppHandle, force: bool, changed_files_only: bool) -> Result<(), String> {
    use crate::diff::extractor::filter_diff_to_files;

    info!(force, changed_files_only, "review session started");

    let config = get_config(app.clone())?;
    info!(
        repos = config.repos.len(),
        engine = %config.engine.r#type,
        model = %config.engine.model,
        "config loaded"
    );

    if config.repos.is_empty() {
        let _ = app.emit("review:completed", serde_json::json!({
            "report_id": "",
            "pr_count": 0,
            "message": "No repositories configured. Add a repo in Configuration."
        }));
        return Ok(());
    }

    let seen = load_seen(&app);
    let mut fetch_errors: Vec<String> = Vec::new();

    // Collect PRs to review
    let mut prs_to_review = Vec::new();
    for repo_cfg in config.repos.iter().filter(|r| r.enabled) {
        let repo = format!("{}/{}", repo_cfg.owner, repo_cfg.repo);
        info!(repo = %repo, "listing pending PRs");
        match crate::commands::github::list_pending_prs(app.clone(), vec![repo_cfg.clone()]).await {
            Ok(prs) => {
                info!(repo = %repo, found = prs.len(), "PR list fetched");
                for pr in prs {
                    if !force {
                        if let Some(repo_seen) = seen.get(&repo) {
                            if let Some(entry) = repo_seen.get(&pr.number.to_string()) {
                                if entry.head_sha == pr.head_sha {
                                    info!(pr = pr.number, "skipping — already reviewed at this SHA");
                                    continue;
                                }
                            }
                        }
                    }
                    info!(pr = pr.number, title = %pr.title, "queued for review");
                    prs_to_review.push((pr, repo_cfg.profile_id.clone()));
                }
            }
            Err(e) => {
                let msg = format!("Failed to fetch PRs for {repo}: {e}");
                error!(repo = %repo, err = %e, "list_pending_prs failed");
                fetch_errors.push(msg.clone());
                let _ = app.emit("review:error", serde_json::json!({ "message": msg }));
            }
        }
    }

    let total = prs_to_review.len();
    info!(total, "starting review run");
    let _ = app.emit("review:started", serde_json::json!({ "total_prs": total }));

    if total == 0 {
        let message = if !fetch_errors.is_empty() {
            fetch_errors.join("; ")
        } else {
            "No open PRs found where you are a requested reviewer.".to_string()
        };
        let _ = app.emit("review:completed", serde_json::json!({
            "report_id": "",
            "pr_count": 0,
            "message": message
        }));
        return Ok(());
    }

    // Run up to 3 reviews concurrently
    let sem = Arc::new(Semaphore::new(3));
    let mut join_set = tokio::task::JoinSet::new();

    let seen_snap = seen.clone();
    for (pr, profile_id) in prs_to_review {
        let app2 = app.clone();
        let config2 = config.clone();
        let sem2 = sem.clone();
        let seen2 = seen_snap.clone();

        join_set.spawn(async move {
            let _permit = sem2.acquire().await.unwrap();

            // Fetch full diff
            let mut pr = pr;
            info!(pr = pr.number, repo = %pr.repo, "fetching diff");
            match fetch_pr_diff(app2.clone(), pr.repo.clone(), pr.number).await {
                Ok(diff) => {
                    info!(pr = pr.number, diff_bytes = diff.len(), "diff fetched");
                    pr.diff = diff;
                }
                Err(e) => {
                    error!(pr = pr.number, err = %e, "fetch_pr_diff failed");
                    let _ = app2.emit("review:error", serde_json::json!({ "message": e }));
                    notify(&app2, "DiffOrbit — Review error", &e);
                    return None;
                }
            }

            // If changed_files_only: filter diff to only files not in previous review
            if changed_files_only {
                let repo_key = pr.repo.clone();
                let pr_key = pr.number.to_string();
                if let Some(entry) = seen2.get(&repo_key).and_then(|m| m.get(&pr_key)) {
                    let prev_files = &entry.files;
                    let new_files: Vec<String> = pr.files.iter()
                        .filter(|f| !prev_files.contains(f))
                        .cloned()
                        .collect();
                    if !new_files.is_empty() {
                        pr.diff = filter_diff_to_files(&pr.diff, &new_files);
                        pr.files = new_files;
                    }
                }
            }

            // Find matching profile
            let profile = config2.profiles.iter()
                .find(|p| p.id == profile_id)
                .or_else(|| config2.profiles.first())
                .cloned()
                .unwrap_or_else(|| crate::commands::config::built_in_profiles()[0].clone());

            info!(
                pr = pr.number,
                engine = %config2.engine.r#type,
                model = %config2.engine.model,
                profile = %profile.name,
                "calling AI engine"
            );
            match run_engine(&app2, &pr, &profile, &config2.engine).await {
                Ok(review) => {
                    info!(
                        pr = pr.number,
                        verdict = %review.verdict,
                        issues = review.issues.len(),
                        "engine returned review"
                    );
                    let _ = app2.emit("review:pr_done", serde_json::json!({
                        "pr_number": review.pr.number,
                        "verdict": review.verdict,
                        "issues_count": review.issues.len(),
                    }));
                    Some((pr.repo.clone(), pr.number.to_string(), pr.updated_at.clone(), pr.head_sha.clone(), pr.files.clone(), review))
                }
                Err(e) => {
                    error!(pr = pr.number, err = %e, "run_engine failed");
                    let _ = app2.emit("review:error", serde_json::json!({ "message": e }));
                    notify(&app2, "DiffOrbit — Review error", &e);
                    None
                }
            }
        });
    }

    let mut reviews = Vec::new();
    let mut seen_updated = load_seen(&app);

    while let Some(result) = join_set.join_next().await {
        if let Ok(Some((repo, pr_num, updated_at, head_sha, files, review))) = result {
            // Auto-action: find the matching repo config
            let repo_cfg = config.repos.iter().find(|r| {
                format!("{}/{}", r.owner, r.repo) == repo
            });
            if let Some(rcfg) = repo_cfg {
                let pr_number: u32 = pr_num.parse().unwrap_or(0);
                // Auto-post comments
                if rcfg.auto_post_comments && !review.issues.is_empty() {
                    let comments: Vec<CommentData> = review.issues.iter()
                        .filter(|iss| iss.selected && iss.file.is_some() && iss.line.is_some())
                        .map(|iss| CommentData {
                            path: iss.file.clone().unwrap(),
                            line: iss.line.unwrap() as u32,
                            side: "RIGHT".to_string(),
                            body: iss.suggested_comment.clone(),
                        })
                        .collect();
                    if !comments.is_empty() {
                        let _ = post_inline_comments(app.clone(), repo.clone(), pr_number, comments, review.commit_sha.clone()).await;
                    }
                }
                // Auto-action based on verdict
                match rcfg.auto_action.as_str() {
                    "approve" if review.verdict == "APPROVE" => {
                        let _ = approve_pr(app.clone(), repo.clone(), pr_number).await;
                    }
                    "request_changes" if review.verdict == "REQUEST_CHANGES" => {
                        let _ = request_changes(app.clone(), repo.clone(), pr_number, review.overall_notes.clone()).await;
                    }
                    _ => {}
                }
            }
            seen_updated.entry(repo).or_default().insert(pr_num, SeenEntry { updated_at, head_sha, files });
            reviews.push(review);
        }
    }

    save_seen(&app, &seen_updated);

    // Persist report
    let report_id = format!("{}", chrono::Utc::now().timestamp_millis());
    let report = Report {
        id: report_id.clone(),
        run_at: chrono::Utc::now().to_rfc3339(),
        reviews,
        engine: format!("{}/{}", config.engine.r#type, config.engine.model),
    };

    let dir = reports_dir(&app);
    let _ = std::fs::create_dir_all(&dir);
    let path = dir.join(format!("{report_id}.json"));
    if let Ok(data) = serde_json::to_string_pretty(&report) {
        let _ = std::fs::write(&path, data);
    }

    let approved = report.reviews.iter().filter(|r| r.verdict == "APPROVE").count();
    let changes  = report.reviews.iter().filter(|r| r.verdict == "REQUEST_CHANGES").count();
    let issues_total: usize = report.reviews.iter().map(|r| r.issues.len()).sum();
    let summary = format!(
        "{} PRs reviewed · {} issues · {} approved · {} need changes",
        report.reviews.len(), issues_total, approved, changes
    );

    let _ = app.emit("review:completed", serde_json::json!({
        "report_id": report_id,
        "pr_count": report.reviews.len(),
        "message": summary
    }));

    // macOS notification
    notify(&app, "DiffOrbit — Review complete", &summary);

    Ok(())
}

#[tauri::command]
pub fn list_reports(app: tauri::AppHandle) -> Result<Vec<ReportMeta>, String> {

    let dir = reports_dir(&app);
    if !dir.exists() { return Ok(vec![]); }

    let mut metas = Vec::new();
    for entry in std::fs::read_dir(&dir).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        if path.extension().map(|e| e == "json").unwrap_or(false) {
            if let Ok(data) = std::fs::read_to_string(&path) {
                if let Ok(report) = serde_json::from_str::<Report>(&data) {
                    metas.push(ReportMeta {
                        id: report.id,
                        run_at: report.run_at,
                        pr_count: report.reviews.len(),
                        engine: report.engine,
                    });
                }
            }
        }
    }
    metas.sort_by(|a, b| b.run_at.cmp(&a.run_at));
    Ok(metas)
}

#[tauri::command]
pub fn load_report(app: tauri::AppHandle, id: String) -> Result<Report, String> {
    let path = reports_dir(&app).join(format!("{id}.json"));
    let data = std::fs::read_to_string(&path).map_err(|e| e.to_string())?;
    serde_json::from_str(&data).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_report(app: tauri::AppHandle, id: String) -> Result<(), String> {
    let path = reports_dir(&app).join(format!("{id}.json"));
    std::fs::remove_file(&path).map_err(|e| e.to_string())
}

/// Review a single specific PR by repo + number, bypassing the seen cache.
/// Returns the report ID so the frontend can navigate directly to it.
#[tauri::command]
pub async fn review_specific_pr(
    app: tauri::AppHandle,
    repo: String,
    number: u32,
) -> Result<String, String> {
    let config = get_config(app.clone())?;

    // Fetch PR info (title, author, files, etc.)
    let mut pr = fetch_pr_info(&app, &repo, number).await?;

    // Fetch full diff
    pr.diff = fetch_pr_diff(app.clone(), repo.clone(), number).await?;

    // Find best matching profile (by repo config, or first profile)
    let profile_id = config.repos.iter()
        .find(|r| format!("{}/{}", r.owner, r.repo) == repo)
        .map(|r| r.profile_id.clone())
        .unwrap_or_default();

    let profile = config.profiles.iter()
        .find(|p| p.id == profile_id)
        .or_else(|| config.profiles.first())
        .cloned()
        .unwrap_or_else(|| crate::commands::config::built_in_profiles()[0].clone());

    let _ = app.emit("review:started", serde_json::json!({ "total_prs": 1 }));

    let review = run_engine(&app, &pr, &profile, &config.engine).await
        .map_err(|e| { let _ = app.emit("review:error", serde_json::json!({ "message": &e })); e })?;

    let _ = app.emit("review:pr_done", serde_json::json!({
        "pr_number": review.pr.number,
        "verdict": review.verdict,
        "issues_count": review.issues.len(),
    }));

    // Persist as a new single-PR report
    let report_id = format!("{}", chrono::Utc::now().timestamp_millis());
    let report = crate::models::review::Report {
        id: report_id.clone(),
        run_at: chrono::Utc::now().to_rfc3339(),
        reviews: vec![review],
        engine: format!("{}/{}", config.engine.r#type, config.engine.model),
    };

    let dir = reports_dir(&app);
    let _ = std::fs::create_dir_all(&dir);
    let path = dir.join(format!("{report_id}.json"));
    if let Ok(data) = serde_json::to_string_pretty(&report) {
        let _ = std::fs::write(&path, data);
    }

    let _ = app.emit("review:completed", serde_json::json!({
        "report_id": report_id,
        "pr_count": 1,
        "message": format!("PR #{number} reviewed")
    }));

    Ok(report_id)
}

#[tauri::command]
pub fn send_welcome_notification(app: tauri::AppHandle) -> Result<(), String> {
    notify(
        &app,
        "Welcome to DiffOrbit",
        "Setup complete. You'll be notified here whenever a review run finishes.",
    );
    Ok(())
}
