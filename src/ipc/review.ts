import { invoke } from "@tauri-apps/api/core"
import type { Report, ReportMeta } from "@/types/review"

export async function triggerRunNow(): Promise<void> {
  return invoke<void>("trigger_run_now")
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
