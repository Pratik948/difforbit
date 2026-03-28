import { create } from "zustand"

type RunStatus = "idle" | "running" | "error"

interface ReviewProgress {
  total: number
  done: number
  currentPr: number | null
}

interface LastRunInfo {
  at: string        // ISO timestamp
  prCount: number   // number of PRs reviewed
  message: string   // human-readable result summary
  reportId: string  // empty string if no report (0 PRs or error)
}

interface ReviewStore {
  runStatus: RunStatus
  progress: ReviewProgress
  lastReportId: string | null
  lastRun: LastRunInfo | null
  lastError: string | null
  setRunStatus: (status: RunStatus) => void
  setProgress: (p: Partial<ReviewProgress>) => void
  setLastReportId: (id: string) => void
  setLastRun: (info: LastRunInfo) => void
  setLastError: (msg: string | null) => void
}

export const useReviewStore = create<ReviewStore>((set) => ({
  runStatus: "idle",
  progress: { total: 0, done: 0, currentPr: null },
  lastReportId: null,
  lastRun: null,
  lastError: null,
  setRunStatus: (status) => set({ runStatus: status }),
  setProgress: (p) => set((s) => ({ progress: { ...s.progress, ...p } })),
  setLastReportId: (id) => set({ lastReportId: id }),
  setLastRun: (info) => set({ lastRun: info, lastError: null }),
  setLastError: (msg) => set({ lastError: msg }),
}))
