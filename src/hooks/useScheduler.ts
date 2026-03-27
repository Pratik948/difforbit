import { useEffect, useState } from "react"
import { listen } from "@tauri-apps/api/event"
import { getNextRunTime } from "@/ipc/review"

export function useScheduler() {
  const [nextRun, setNextRun] = useState<string | null>(null)

  useEffect(() => {
    getNextRunTime().then(setNextRun).catch(() => {})

    const unlistenPromise = listen<{ next_run: string }>("scheduler:tick", (e) => {
      setNextRun(e.payload.next_run)
    })

    return () => {
      unlistenPromise.then(u => u())
    }
  }, [])

  const formatNextRun = (iso: string | null): string => {
    if (!iso) return "Not scheduled"
    const dt = new Date(iso)
    const now = new Date()
    const isToday = dt.toDateString() === now.toDateString()
    return `${isToday ? "Today" : "Tomorrow"} ${dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
  }

  return { nextRun, nextRunLabel: formatNextRun(nextRun) }
}
