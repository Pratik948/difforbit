use crate::commands::{config::get_config, engines::run_engine, github::fetch_pr_diff};
use crate::models::review::{Report, ReportMeta};
use std::collections::HashMap;
use std::sync::Arc;
use tauri::{Emitter, Manager};
use tauri_plugin_notification::NotificationExt;
use tokio::sync::Semaphore;

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

pub async fn run_review_session(app: tauri::AppHandle, force: bool, changed_files_only: bool) -> Result<(), String> {
    use crate::diff::extractor::filter_diff_to_files;

    let config = get_config(app.clone())?;
    let seen = load_seen(&app);

    // Collect PRs to review
    let mut prs_to_review = Vec::new();
    for repo_cfg in config.repos.iter().filter(|r| r.enabled) {
        let repo = format!("{}/{}", repo_cfg.owner, repo_cfg.repo);
        let prs = crate::commands::github::list_pending_prs(
            app.clone(),
            vec![repo_cfg.clone()],
        ).await.unwrap_or_default();

        for pr in prs {
            if !force {
                if let Some(repo_seen) = seen.get(&repo) {
                    if let Some(entry) = repo_seen.get(&pr.number.to_string()) {
                        if entry.head_sha == pr.head_sha && !changed_files_only {
                            continue; // already reviewed, no new commits
                        }
                        if entry.head_sha == pr.head_sha && changed_files_only {
                            continue; // no new commits — nothing to re-review
                        }
                    }
                }
            }
            prs_to_review.push((pr, repo_cfg.profile_id.clone()));
        }
    }

    let total = prs_to_review.len();
    let _ = app.emit("review:started", serde_json::json!({ "total_prs": total }));

    if total == 0 {
        let _ = app.emit("review:completed", serde_json::json!({ "report_id": "" }));
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
            match fetch_pr_diff(app2.clone(), pr.repo.clone(), pr.number).await {
                Ok(diff) => pr.diff = diff,
                Err(e) => {
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

            match run_engine(&app2, &pr, &profile, &config2.engine).await {
                Ok(review) => {
                    let _ = app2.emit("review:pr_done", serde_json::json!({
                        "pr_number": review.pr.number,
                        "verdict": review.verdict,
                        "issues_count": review.issues.len(),
                    }));
                    Some((pr.repo.clone(), pr.number.to_string(), pr.updated_at.clone(), pr.head_sha.clone(), pr.files.clone(), review))
                }
                Err(e) => {
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

    let _ = app.emit("review:completed", serde_json::json!({ "report_id": report_id }));

    // macOS notification
    let approved = report.reviews.iter().filter(|r| r.verdict == "APPROVE").count();
    let changes  = report.reviews.iter().filter(|r| r.verdict == "REQUEST_CHANGES").count();
    let issues_total: usize = report.reviews.iter().map(|r| r.issues.len()).sum();
    let body = format!(
        "{} PRs reviewed · {} issues · ✅ {} approved · ⚠ {} need changes",
        report.reviews.len(), issues_total, approved, changes
    );
    notify(&app, "DiffOrbit — Review complete", &body);

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

#[tauri::command]
pub fn send_welcome_notification(app: tauri::AppHandle) -> Result<(), String> {
    notify(
        &app,
        "Welcome to DiffOrbit",
        "Setup complete. You'll be notified here whenever a review run finishes.",
    );
    Ok(())
}
