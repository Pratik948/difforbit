import { useEffect } from "react"
import { listen } from "@tauri-apps/api/event"
import { useReviewStore } from "@/store/reviewStore"

export function useTauriEvents() {
  const { setRunStatus, setProgress, setLastReportId } = useReviewStore()

  useEffect(() => {
    const unlisten: Array<() => void> = []

    listen<{ total_prs: number }>("review:started", (e) => {
      setRunStatus("running")
      setProgress({ total: e.payload.total_prs, done: 0, currentPr: null })
    }).then(u => unlisten.push(u))

    listen<{ pr_number: number }>("review:pr_done", (e) => {
      setProgress({ currentPr: e.payload.pr_number })
      // increment done via store
      useReviewStore.setState(s => ({
        progress: { ...s.progress, done: s.progress.done + 1 }
      }))
    }).then(u => unlisten.push(u))

    listen<{ report_id: string }>("review:completed", (e) => {
      setRunStatus("idle")
      setLastReportId(e.payload.report_id)
    }).then(u => unlisten.push(u))

    listen<unknown>("review:error", () => {
      setRunStatus("error")
    }).then(u => unlisten.push(u))

    return () => { unlisten.forEach(u => u()) }
  }, [setRunStatus, setProgress, setLastReportId])
}
