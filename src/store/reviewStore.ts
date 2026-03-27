import { create } from "zustand"

type RunStatus = "idle" | "running" | "error"

interface ReviewProgress {
  total: number
  done: number
  currentPr: number | null
}

interface ReviewStore {
  runStatus: RunStatus
  progress: ReviewProgress
  lastReportId: string | null
  setRunStatus: (status: RunStatus) => void
  setProgress: (p: Partial<ReviewProgress>) => void
  setLastReportId: (id: string) => void
}

export const useReviewStore = create<ReviewStore>((set) => ({
  runStatus: "idle",
  progress: { total: 0, done: 0, currentPr: null },
  lastReportId: null,
  setRunStatus: (status) => set({ runStatus: status }),
  setProgress: (p) => set((s) => ({ progress: { ...s.progress, ...p } })),
  setLastReportId: (id) => set({ lastReportId: id }),
}))
