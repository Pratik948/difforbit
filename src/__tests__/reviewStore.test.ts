import { describe, it, expect, beforeEach } from "vitest"
import { useReviewStore } from "@/store/reviewStore"

beforeEach(() => {
  // Reset store to initial state between tests
  useReviewStore.setState({
    runStatus: "idle",
    progress: { total: 0, done: 0, currentPr: null },
    lastReportId: null,
    lastRun: null,
    lastError: null,
  })
})

describe("reviewStore — initial state", () => {
  it("starts idle", () => {
    expect(useReviewStore.getState().runStatus).toBe("idle")
  })

  it("starts with empty progress", () => {
    const { progress } = useReviewStore.getState()
    expect(progress.total).toBe(0)
    expect(progress.done).toBe(0)
    expect(progress.currentPr).toBeNull()
  })

  it("starts with null lastReportId, lastRun, lastError", () => {
    const state = useReviewStore.getState()
    expect(state.lastReportId).toBeNull()
    expect(state.lastRun).toBeNull()
    expect(state.lastError).toBeNull()
  })
})

describe("setRunStatus", () => {
  it("transitions to running", () => {
    useReviewStore.getState().setRunStatus("running")
    expect(useReviewStore.getState().runStatus).toBe("running")
  })

  it("transitions to error", () => {
    useReviewStore.getState().setRunStatus("error")
    expect(useReviewStore.getState().runStatus).toBe("error")
  })

  it("transitions back to idle", () => {
    useReviewStore.getState().setRunStatus("running")
    useReviewStore.getState().setRunStatus("idle")
    expect(useReviewStore.getState().runStatus).toBe("idle")
  })
})

describe("setProgress", () => {
  it("updates total and done independently", () => {
    useReviewStore.getState().setProgress({ total: 5 })
    expect(useReviewStore.getState().progress.total).toBe(5)
    expect(useReviewStore.getState().progress.done).toBe(0)
  })

  it("merges partial updates without overwriting other fields", () => {
    useReviewStore.getState().setProgress({ total: 3, done: 1 })
    useReviewStore.getState().setProgress({ done: 2 })
    const { progress } = useReviewStore.getState()
    expect(progress.total).toBe(3)
    expect(progress.done).toBe(2)
  })

  it("sets currentPr", () => {
    useReviewStore.getState().setProgress({ currentPr: 42 })
    expect(useReviewStore.getState().progress.currentPr).toBe(42)
  })
})

describe("setLastReportId", () => {
  it("stores the report ID", () => {
    useReviewStore.getState().setLastReportId("report-abc")
    expect(useReviewStore.getState().lastReportId).toBe("report-abc")
  })
})

describe("setLastRun", () => {
  it("stores run info", () => {
    const info = { at: "2026-03-29T10:00:00Z", prCount: 3, message: "3 PRs reviewed", reportId: "r1" }
    useReviewStore.getState().setLastRun(info)
    expect(useReviewStore.getState().lastRun).toEqual(info)
  })

  it("clears lastError when a successful run is recorded", () => {
    useReviewStore.getState().setLastError("previous error")
    useReviewStore.getState().setLastRun({ at: "2026-03-29T10:00:00Z", prCount: 1, message: "ok", reportId: "r1" })
    expect(useReviewStore.getState().lastError).toBeNull()
  })
})

describe("setLastError", () => {
  it("stores an error message", () => {
    useReviewStore.getState().setLastError("something went wrong")
    expect(useReviewStore.getState().lastError).toBe("something went wrong")
  })

  it("can be cleared by passing null", () => {
    useReviewStore.getState().setLastError("error")
    useReviewStore.getState().setLastError(null)
    expect(useReviewStore.getState().lastError).toBeNull()
  })
})
