mod commands;
mod diff;
mod logger;
mod models;

use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, TrayIconBuilder, TrayIconEvent},
    Manager,
};

// Keep the log guard alive for the entire process lifetime.
static LOG_GUARD: std::sync::OnceLock<logger::LogGuard> = std::sync::OnceLock::new();

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_notification::init())
        .setup(|app| {
            // Initialise file logging as early as possible.
            let log_dir = app.path().app_data_dir().unwrap().join("logs");
            LOG_GUARD.get_or_init(|| logger::init(&log_dir));

            let open_item = MenuItem::with_id(app, "open", "Open DiffOrbit", true, None::<&str>)?;
            let run_item = MenuItem::with_id(app, "run_now", "Run Now", true, None::<&str>)?;
            let quit_item = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&open_item, &run_item, &quit_item])?;

            TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click { button: MouseButton::Left, .. } = event {
                        let app = tray.app_handle();
                        if let Some(win) = app.get_webview_window("main") {
                            let _ = win.show();
                            let _ = win.set_focus();
                        }
                    }
                })
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "open" => {
                        if let Some(win) = app.get_webview_window("main") {
                            let _ = win.show();
                            let _ = win.set_focus();
                        }
                    }
                    "run_now" => {
                        let app = app.clone();
                        tauri::async_runtime::spawn(async move {
                            let _ = commands::review::trigger_run_now(app).await;
                        });
                    }
                    "quit" => {
                        app.exit(0);
                    }
                    _ => {}
                })
                .build(app)?;

            // Start scheduler in background
            commands::scheduler::start_scheduler(app.handle().clone());

            // Catch-up on wake check
            commands::scheduler::check_catch_up(app.handle().clone());

            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                window.hide().unwrap();
                api.prevent_close();
            }
        })
        .invoke_handler(tauri::generate_handler![
            // config
            commands::config::get_config,
            commands::config::save_config,
            commands::config::reset_profile,
            // github
            commands::github::check_gh_auth,
            commands::github::list_pending_prs,
            commands::github::fetch_pr_diff,
            commands::github::post_inline_comments,
            commands::github::approve_pr,
            commands::github::request_changes,
            // engines
            commands::engines::list_claude_models,
            // keychain
            commands::keychain::save_api_key,
            commands::keychain::has_api_key,
            commands::keychain::delete_api_key,
            // review
            commands::review::trigger_run_now,
            commands::review::trigger_review_changed_files,
            commands::review::list_reports,
            commands::review::load_report,
            commands::review::delete_report,
            commands::review::send_welcome_notification,
            // scheduler
            commands::scheduler::get_next_run_time,
            commands::scheduler::trigger_run_now_cmd,
            commands::scheduler::get_launch_agent_status,
            commands::scheduler::set_launch_agent,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
