use crate::models::config::{AppConfig, ReviewProfile};
use tauri::Manager;

pub fn built_in_profiles() -> Vec<ReviewProfile> {
    vec![
        ReviewProfile {
            id: "builtin-generic".to_string(),
            name: "Generic".to_string(),
            languages: vec!["any".to_string()],
            extensions: vec!["*".to_string()],
            is_built_in: true,
            system_prompt: "You are a senior software engineer performing a thorough code review. \
Analyse the PR diff for correctness, readability, maintainability, and security. \
Return raw JSON only — no markdown, no preamble.".to_string(),
        },
        ReviewProfile {
            id: "builtin-react-ts".to_string(),
            name: "React / TypeScript".to_string(),
            languages: vec!["typescript".to_string(), "javascript".to_string()],
            extensions: vec![".ts".to_string(), ".tsx".to_string(), ".js".to_string(), ".jsx".to_string()],
            is_built_in: true,
            system_prompt: "You are a senior React/TypeScript engineer. Review for: correct hook usage, \
unnecessary re-renders, type safety, prop drilling, missing error boundaries, accessibility, \
and bundle-size concerns. Return raw JSON only.".to_string(),
        },
        ReviewProfile {
            id: "builtin-flutter".to_string(),
            name: "Flutter / Dart".to_string(),
            languages: vec!["dart".to_string()],
            extensions: vec![".dart".to_string()],
            is_built_in: true,
            system_prompt: "You are a senior Flutter/Dart engineer. Review for: widget rebuild efficiency, \
const constructors, state management correctness, platform-channel safety, null safety, \
and pubspec dependency hygiene. Return raw JSON only.".to_string(),
        },
        ReviewProfile {
            id: "builtin-swift".to_string(),
            name: "Swift".to_string(),
            languages: vec!["swift".to_string()],
            extensions: vec![".swift".to_string()],
            is_built_in: true,
            system_prompt: "You are a senior Swift/iOS engineer. Review for: memory management, \
retain cycles, concurrency (async/await, actors), optionals, protocol conformance, \
and SwiftUI lifecycle correctness. Return raw JSON only.".to_string(),
        },
        ReviewProfile {
            id: "builtin-kotlin".to_string(),
            name: "Kotlin".to_string(),
            languages: vec!["kotlin".to_string()],
            extensions: vec![".kt".to_string(), ".kts".to_string()],
            is_built_in: true,
            system_prompt: "You are a senior Kotlin/Android engineer. Review for: coroutine scope \
management, null safety, sealed class exhaustiveness, Jetpack Compose recomposition, \
and gradle dependency hygiene. Return raw JSON only.".to_string(),
        },
        ReviewProfile {
            id: "builtin-java".to_string(),
            name: "Java".to_string(),
            languages: vec!["java".to_string()],
            extensions: vec![".java".to_string()],
            is_built_in: true,
            system_prompt: "You are a senior Java engineer. Review for: exception handling, \
resource leaks, thread safety, equals/hashCode contracts, generics correctness, \
and Spring/Jakarta EE lifecycle issues. Return raw JSON only.".to_string(),
        },
        ReviewProfile {
            id: "builtin-react-native".to_string(),
            name: "React Native".to_string(),
            languages: vec!["typescript".to_string(), "javascript".to_string()],
            extensions: vec![".ts".to_string(), ".tsx".to_string(), ".js".to_string()],
            is_built_in: true,
            system_prompt: "You are a senior React Native engineer. Review for: bridge calls, \
FlatList optimisation, gesture handler correctness, native module usage, \
and platform-specific code paths. Return raw JSON only.".to_string(),
        },
        ReviewProfile {
            id: "builtin-c-cpp".to_string(),
            name: "C / C++".to_string(),
            languages: vec!["c".to_string(), "cpp".to_string()],
            extensions: vec![".c".to_string(), ".cpp".to_string(), ".h".to_string(), ".hpp".to_string()],
            is_built_in: true,
            system_prompt: "You are a senior C/C++ engineer. Review for: memory safety, buffer overflows, \
undefined behaviour, RAII, smart pointer usage, and thread-safety. Return raw JSON only.".to_string(),
        },
    ]
}

fn config_path(app: &tauri::AppHandle) -> std::path::PathBuf {
    app.path().app_data_dir().unwrap().join("config.json")
}

#[tauri::command]
pub fn get_config(app: tauri::AppHandle) -> Result<AppConfig, String> {
    let path = config_path(&app);
    if !path.exists() {
        return Ok(AppConfig::default());
    }
    let data = std::fs::read_to_string(&path).map_err(|e| e.to_string())?;
    let mut config: AppConfig = serde_json::from_str(&data).map_err(|e| e.to_string())?;

    // If the saved config has no profiles (e.g. saved before built-ins were added),
    // populate with the built-in set so the Profiles page is never empty.
    if config.profiles.is_empty() {
        config.profiles = built_in_profiles();
    }

    Ok(config)
}

#[tauri::command]
pub fn save_config(app: tauri::AppHandle, config: AppConfig) -> Result<(), String> {
    let path = config_path(&app);
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let data = serde_json::to_string_pretty(&config).map_err(|e| e.to_string())?;
    std::fs::write(&path, data).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn reset_profile(id: String) -> Result<ReviewProfile, String> {
    built_in_profiles()
        .into_iter()
        .find(|p| p.id == id)
        .ok_or_else(|| format!("Built-in profile '{}' not found", id))
}
