import React from "react"
import { colors, space, textGlow } from "@matrixui/tokens"
import { Panel, Button } from "@matrixui/react"
import { useReviewStore } from "@/store/reviewStore"
import { triggerRunNow } from "@/ipc/review"

export default function Dashboard() {
  const { runStatus, progress, lastReportId } = useReviewStore()

  const headerStyle: React.CSSProperties = {
    fontFamily: "var(--font-display, 'Share Tech Mono', monospace)",
    fontSize: "20px",
    color: colors.text.primary,
    textShadow: textGlow.greenPrimary,
    marginBottom: space['6'],
    letterSpacing: "0.05em",
  }

  const pageStyle: React.CSSProperties = {
    padding: space['6'],
    height: "100%",
  }

  const handleRunNow = async () => {
    try {
      await triggerRunNow()
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <div style={pageStyle}>
      <div style={headerStyle}>// DASHBOARD</div>
      <Panel rain={{ preset: "diff" }} style={{ padding: space['4'], marginBottom: space['4'] }}>
        <div style={{ fontFamily: "var(--font-body, monospace)", fontSize: "12px", color: colors.text.secondary, marginBottom: space['3'] }}>
          STATUS: <span style={{ color: runStatus === "running" ? colors.status.ahead : runStatus === "error" ? colors.status.behind : colors.status.synced }}>{runStatus.toUpperCase()}</span>
        </div>
        {runStatus === "running" && (
          <div style={{ marginBottom: space['3'], fontFamily: "var(--font-body, monospace)", fontSize: "11px", color: colors.text.tertiary }}>
            Progress: {progress.done}/{progress.total} PRs
          </div>
        )}
        {lastReportId && (
          <div style={{ fontFamily: "var(--font-body, monospace)", fontSize: "11px", color: colors.text.tertiary, marginBottom: space['3'] }}>
            Last report: {lastReportId}
          </div>
        )}
        <Button variant="primary" onClick={handleRunNow} loading={runStatus === "running"}>
          RUN NOW
        </Button>
      </Panel>
    </div>
  )
}
