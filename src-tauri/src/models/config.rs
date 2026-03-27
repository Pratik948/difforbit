use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReviewProfile {
    pub id: String,
    pub name: String,
    pub languages: Vec<String>,
    pub extensions: Vec<String>,
    pub system_prompt: String,
    pub is_built_in: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RepoConfig {
    pub owner: String,
    pub repo: String,
    pub profile_id: String,
    pub enabled: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScheduleConfig {
    pub enabled: bool,
    pub hour: u8,
    pub minute: u8,
    pub catch_up_on_wake: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EngineConfig {
    pub r#type: String,
    pub model: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub base_url: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub api_key_ref: Option<String>,
    pub max_tokens: u32,
    pub temperature: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppConfig {
    pub github_username: String,
    pub repos: Vec<RepoConfig>,
    pub schedule: ScheduleConfig,
    pub engine: EngineConfig,
    pub profiles: Vec<ReviewProfile>,
    pub show_diff: bool,
    pub diff_context: u32,
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            github_username: String::new(),
            repos: vec![],
            schedule: ScheduleConfig {
                enabled: false,
                hour: 9,
                minute: 0,
                catch_up_on_wake: true,
            },
            engine: EngineConfig {
                r#type: "anthropic".to_string(),
                model: "claude-opus-4-5-20251001".to_string(),
                base_url: None,
                api_key_ref: None,
                max_tokens: 4096,
                temperature: 0.2,
            },
            profiles: crate::commands::config::built_in_profiles(),
            show_diff: true,
            diff_context: 5,
        }
    }
}
