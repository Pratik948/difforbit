use crate::commands::config::get_config;
use crate::commands::review::run_review_session;
use crate::models::config::ScheduleConfig;
use std::sync::Mutex;
use chrono::TimeZone as _;
use std::time::Duration;
use tauri::Emitter;

/// Global state: last run time (ISO string)
static LAST_RUN_AT: Mutex<Option<String>> = Mutex::new(None);
/// Global state: next run time (ISO string)
static NEXT_RUN_AT: Mutex<Option<String>> = Mutex::new(None);

fn compute_next_run(schedule: &ScheduleConfig) -> Option<chrono::DateTime<chrono::Local>> {
    if !schedule.enabled { return None; }
    let now = chrono::Local::now();
    let today_run = now
        .date_naive()
        .and_hms_opt(schedule.hour as u32, schedule.minute as u32, 0)?;
    let today_run = chrono::Local::now()
        .timezone()
        .from_local_datetime(&today_run)
        .single()?;

    if today_run > now {
        Some(today_run)
    } else {
        // schedule for tomorrow
        let tomorrow = (now + chrono::Duration::days(1))
            .date_naive()
            .and_hms_opt(schedule.hour as u32, schedule.minute as u32, 0)?;
        chrono::Local::now()
            .timezone()
            .from_local_datetime(&tomorrow)
            .single()
    }
}

pub fn start_scheduler(app: tauri::AppHandle) {
    tauri::async_runtime::spawn(async move {
        loop {
            // Read config each iteration to pick up changes
            let schedule = match get_config(app.clone()) {
                Ok(cfg) => cfg.schedule,
                Err(_) => {
                    tokio::time::sleep(Duration::from_secs(60)).await;
                    continue;
                }
            };

            if !schedule.enabled {
                tokio::time::sleep(Duration::from_secs(60)).await;
                continue;
            }

            let next = compute_next_run(&schedule);
            if let Some(next_dt) = &next {
                let iso = next_dt.to_rfc3339();
                *NEXT_RUN_AT.lock().unwrap() = Some(iso.clone());
                let _ = app.emit("scheduler:tick", serde_json::json!({ "next_run": iso }));

                let now = chrono::Local::now();
                let secs_until = (*next_dt - now).num_seconds();

                if secs_until > 0 {
                    // Sleep in 60s chunks, refreshing config each time
                    let sleep_secs = secs_until.min(60) as u64;
                    tokio::time::sleep(Duration::from_secs(sleep_secs)).await;
                    continue;
                }
                // Time to run
                *LAST_RUN_AT.lock().unwrap() = Some(chrono::Local::now().to_rfc3339());
                let app2 = app.clone();
                tauri::async_runtime::spawn(async move {
                    let _ = run_review_session(app2, false).await;
                });
                // Sleep 61s to avoid double-trigger in same minute
                tokio::time::sleep(Duration::from_secs(61)).await;
            } else {
                tokio::time::sleep(Duration::from_secs(60)).await;
            }
        }
    });
}

#[tauri::command]
pub fn get_next_run_time() -> Result<Option<String>, String> {
    Ok(NEXT_RUN_AT.lock().unwrap().clone())
}

#[tauri::command]
pub async fn trigger_run_now_cmd(app: tauri::AppHandle) -> Result<(), String> {
    *LAST_RUN_AT.lock().unwrap() = Some(chrono::Local::now().to_rfc3339());
    run_review_session(app, false).await
}

/// Check if a scheduled run was missed (for catch-up-on-wake)
pub fn check_catch_up(app: tauri::AppHandle) {
    let last = LAST_RUN_AT.lock().unwrap().clone();
    let config = match get_config(app.clone()) {
        Ok(c) => c,
        Err(_) => return,
    };
    if !config.schedule.catch_up_on_wake || !config.schedule.enabled { return; }

    let now = chrono::Local::now();
    let today_scheduled = match now
        .date_naive()
        .and_hms_opt(config.schedule.hour as u32, config.schedule.minute as u32, 0)
        .and_then(|dt| chrono::Local::now().timezone().from_local_datetime(&dt).single())
    {
        Some(dt) => dt,
        None => return,
    };

    // If scheduled time already passed today and we haven't run since
    if today_scheduled < now {
        let missed = match last {
            None => true,
            Some(ref last_str) => {
                match chrono::DateTime::parse_from_rfc3339(last_str) {
                    Ok(last_dt) => last_dt.with_timezone(&chrono::Local) < today_scheduled,
                    Err(_) => true,
                }
            }
        };
        if missed {
            let app2 = app.clone();
            tauri::async_runtime::spawn(async move {
                let _ = run_review_session(app2, false).await;
            });
        }
    }
}

/// Write/remove com.difforbit.app LaunchAgent plist
pub fn install_launch_agent() -> Result<(), String> {
    let home = std::env::var("HOME").map_err(|e| e.to_string())?;
    let la_dir = format!("{home}/Library/LaunchAgents");
    std::fs::create_dir_all(&la_dir).map_err(|e| e.to_string())?;

    let exe = std::env::current_exe().map_err(|e| e.to_string())?;
    let plist = format!(r#"<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.difforbit.app</string>
    <key>ProgramArguments</key>
    <array>
        <string>{}</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
</dict>
</plist>"#, exe.to_string_lossy());

    let plist_path = format!("{la_dir}/com.difforbit.app.plist");
    std::fs::write(&plist_path, plist).map_err(|e| e.to_string())
}

pub fn uninstall_launch_agent() -> Result<(), String> {
    let home = std::env::var("HOME").map_err(|e| e.to_string())?;
    let plist_path = format!("{home}/Library/LaunchAgents/com.difforbit.app.plist");
    if std::path::Path::new(&plist_path).exists() {
        std::fs::remove_file(&plist_path).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn get_launch_agent_status() -> bool {
    let home = std::env::var("HOME").unwrap_or_default();
    std::path::Path::new(&format!("{home}/Library/LaunchAgents/com.difforbit.app.plist")).exists()
}

#[tauri::command]
pub fn set_launch_agent(enabled: bool) -> Result<(), String> {
    if enabled {
        install_launch_agent()
    } else {
        uninstall_launch_agent()
    }
}
