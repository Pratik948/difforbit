use serde::{Deserialize, Serialize};
use crate::models::pr::PullRequest;
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DiffLine {
    pub r#type: String,  // "add" | "remove" | "context" | "hunk"
    pub line: Option<u32>,
    pub text: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct ReviewIssue {
    pub file: Option<String>,
    pub line: Option<u32>,
    pub description: String,
    pub severity: String,
    pub category: String,
    pub suggested_comment: String,
    pub selected: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub diff_hunk: Option<Vec<DiffLine>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PRReview {
    pub pr: PullRequest,
    pub verdict: String,
    pub summary: String,
    pub issues: Vec<ReviewIssue>,
    pub positive_notes: Vec<String>,
    pub overall_notes: String,
    pub reviewed_at: String,
    pub engine: String,
    pub diff_map: HashMap<String, HashMap<u32, u32>>,
    pub commit_sha: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReportMeta {
    pub id: String,
    pub run_at: String,
    pub pr_count: usize,
    pub engine: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Report {
    pub id: String,
    pub run_at: String,
    pub reviews: Vec<PRReview>,
    pub engine: String,
}
