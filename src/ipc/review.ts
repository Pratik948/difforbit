import { invoke } from "@tauri-apps/api/core"
import type { Report, ReportMeta } from "@/types/review"

export async function triggerRunNow(): Promise<void> {
  return invoke<void>("trigger_run_now")
}

export async function sendWelcomeNotification(): Promise<void> {
  return invoke<void>("send_welcome_notification")
}

export async function triggerReviewChangedFiles(): Promise<void> {
  return invoke<void>("trigger_review_changed_files")
}

export async function triggerForceRun(): Promise<void> {
  return invoke<void>("trigger_force_run")
}

export async function listReports(): Promise<ReportMeta[]> {
  return invoke<ReportMeta[]>("list_reports")
}

export async function loadReport(id: string): Promise<Report> {
  return invoke<Report>("load_report", { id })
}

export async function deleteReport(id: string): Promise<void> {
  return invoke<void>("delete_report", { id })
}

export async function getNextRunTime(): Promise<string | null> {
  return invoke<string | null>("get_next_run_time")
}

export async function getLaunchAgentStatus(): Promise<boolean> {
  return invoke<boolean>("get_launch_agent_status")
}

export async function setLaunchAgent(enabled: boolean): Promise<void> {
  return invoke<void>("set_launch_agent", { enabled })
}

export async function reviewSpecificPr(repo: string, number: number): Promise<string> {
  return invoke<string>("review_specific_pr", { repo, number })
}
