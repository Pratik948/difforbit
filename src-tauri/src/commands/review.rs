use crate::commands::{config::get_config, engines::run_engine, github::fetch_pr_diff};
use crate::models::review::{Report, ReportMeta};
use std::collections::HashMap;
use tauri::{Emitter, Manager};

fn reports_dir(app: &tauri::AppHandle) -> std::path::PathBuf {
    app.path().app_data_dir().unwrap().join("reports")
}

fn seen_path(app: &tauri::AppHandle) -> std::path::PathBuf {
    app.path().app_data_dir().unwrap().join("seen.json")
}

type SeenMap = HashMap<String, HashMap<String, String>>;

fn load_seen(app: &tauri::AppHandle) -> SeenMap {
    let path = seen_path(app);
    if !path.exists() { return HashMap::new(); }
    let data = std::fs::read_to_string(&path).unwrap_or_default();
    serde_json::from_str(&data).unwrap_or_default()
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
    run_review_session(app, false).await
}

pub async fn run_review_session(app: tauri::AppHandle, force: bool) -> Result<(), String> {
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
                    if let Some(seen_at) = repo_seen.get(&pr.number.to_string()) {
                        if seen_at == &pr.updated_at {
                            continue; // already reviewed, unchanged
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

    let mut reviews = Vec::new();
    let mut seen_updated = load_seen(&app);

    for (mut pr, profile_id) in prs_to_review {
        // Fetch diff
        match fetch_pr_diff(app.clone(), pr.repo.clone(), pr.number).await {
            Ok(diff) => pr.diff = diff,
            Err(e) => {
                let _ = app.emit("review:error", serde_json::json!({ "message": e }));
                continue;
            }
        }

        // Find matching profile
        let profile = config.profiles.iter()
            .find(|p| p.id == profile_id)
            .or_else(|| config.profiles.first())
            .cloned()
            .unwrap_or_else(|| crate::commands::config::built_in_profiles()[0].clone());

        match run_engine(&app, &pr, &profile, &config.engine).await {
            Ok(review) => {
                let pr_num = pr.number.to_string();
                let repo = pr.repo.clone();
                let updated = pr.updated_at.clone();

                let _ = app.emit("review:pr_done", serde_json::json!({
                    "pr_number": review.pr.number,
                    "verdict": review.verdict,
                    "issues_count": review.issues.len(),
                }));

                seen_updated
                    .entry(repo)
                    .or_default()
                    .insert(pr_num, updated);

                reviews.push(review);
            }
            Err(e) => {
                let _ = app.emit("review:error", serde_json::json!({ "message": e }));
            }
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
