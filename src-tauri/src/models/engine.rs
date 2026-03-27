use serde::{Deserialize, Serialize};

// Mirrors the frontend EngineConfig
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

/// Raw issue as returned by the AI (snake_case JSON)
#[derive(Debug, Deserialize)]
pub struct RawIssue {
    pub file: Option<String>,
    pub line: Option<u32>,
    pub description: String,
    pub severity: String,
    pub category: String,
    pub suggested_comment: String,
}

/// Raw review JSON returned by all engine paths
#[derive(Debug, Deserialize)]
pub struct RawReview {
    pub verdict: String,
    pub summary: String,
    pub issues: Vec<RawIssue>,
    pub positive_notes: Vec<String>,
    pub overall_notes: String,
}
