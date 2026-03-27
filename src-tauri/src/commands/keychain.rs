/// Keychain storage uses a simple file-based approach for Linux/macOS compatibility.
/// On macOS production, this would use the security-framework crate.
/// Keys are stored in a protected file (not config.json).

use tauri::Manager;
use std::collections::HashMap;

fn keys_path(app: &tauri::AppHandle) -> std::path::PathBuf {
    app.path().app_data_dir().unwrap().join(".keys")
}

fn load_keys(app: &tauri::AppHandle) -> HashMap<String, String> {
    let path = keys_path(app);
    if !path.exists() {
        return HashMap::new();
    }
    let data = std::fs::read_to_string(&path).unwrap_or_default();
    serde_json::from_str(&data).unwrap_or_default()
}

fn save_keys(app: &tauri::AppHandle, keys: &HashMap<String, String>) -> Result<(), String> {
    let path = keys_path(app);
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let data = serde_json::to_string(keys).map_err(|e| e.to_string())?;
    std::fs::write(&path, data).map_err(|e| e.to_string())
}

/// Internal only — Rust reads keys, never exposed to renderer
pub fn get_api_key_internal(app: &tauri::AppHandle, service: &str) -> Option<String> {
    load_keys(app).remove(service)
}

#[tauri::command]
pub fn save_api_key(app: tauri::AppHandle, service: String, key: String) -> Result<(), String> {
    let mut keys = load_keys(&app);
    keys.insert(service, key);
    save_keys(&app, &keys)
}

#[tauri::command]
pub fn has_api_key(app: tauri::AppHandle, service: String) -> Result<bool, String> {
    Ok(load_keys(&app).contains_key(&service))
}

#[tauri::command]
pub fn delete_api_key(app: tauri::AppHandle, service: String) -> Result<(), String> {
    let mut keys = load_keys(&app);
    keys.remove(&service);
    save_keys(&app, &keys)
}
