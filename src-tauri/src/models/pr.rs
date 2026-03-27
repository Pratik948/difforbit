use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PullRequest {
    pub number: u32,
    pub title: String,
    pub author: String,
    pub url: String,
    pub repo: String,
    pub updated_at: String,
    pub diff: String,
    pub files: Vec<String>,
    pub head_sha: String,
}
