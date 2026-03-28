import { invoke } from "@tauri-apps/api/core"
import type { PullRequest } from "@/types/pr"
import type { RepoConfig } from "@/types/config"

export async function checkGhAuth(): Promise<string> {
  return invoke<string>("check_gh_auth")
}

export async function listPendingPrs(repos: RepoConfig[]): Promise<PullRequest[]> {
  return invoke<PullRequest[]>("list_pending_prs", { repos })
}

export async function approvePr(repo: string, number: number): Promise<void> {
  return invoke<void>("approve_pr", { repo, number })
}

export async function requestChanges(repo: string, number: number, body: string): Promise<void> {
  return invoke<void>("request_changes", { repo, number, body })
}

export interface CommentData {
  path: string
  line: number
  side: string  // "RIGHT" for additions/context, "LEFT" for deletions
  body: string
}

export interface PostResult {
  posted: number
  failed: number
}

export async function postInlineComments(
  repo: string,
  number: number,
  comments: CommentData[],
  commitSha: string
): Promise<PostResult> {
  return invoke<PostResult>("post_inline_comments", { repo, number, comments, commitSha })
}
