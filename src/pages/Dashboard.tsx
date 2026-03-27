import React from "react"
import { useNavigate } from "react-router-dom"
import { colors, space, textGlow } from "@matrixui/tokens"
import { Panel, Button } from "@matrixui/react"
import { useReviewStore } from "@/store/reviewStore"
import { useTauriEvents } from "@/hooks/useTauriEvents"
import { useScheduler } from "@/hooks/useScheduler"
import { triggerRunNow } from "@/ipc/review"

export default function Dashboard() {
  const { runStatus, progress, lastReportId } = useReviewStore()
  const { nextRunLabel } = useScheduler()
  const navigate = useNavigate()
  useTauriEvents()

  const handleRunNow = async () => {
    try { await triggerRunNow() } catch (e) { console.error(e) }
  }

  const headerStyle: React.CSSProperties = {
    fontFamily: "var(--font-display, 'Share Tech Mono', monospace)",
    fontSize: "20px",
    color: colors.text.primary,
    textShadow: textGlow.greenPrimary,
    marginBottom: space['6'],
    letterSpacing: "0.05em",
  }

  const labelStyle: React.CSSProperties = {
    fontFamily: "var(--font-body, monospace)",
    fontSize: "11px",
    color: colors.text.tertiary,
    letterSpacing: "0.08em",
    minWidth: "100px",
  }

  const valueStyle: React.CSSProperties = {
    fontFamily: "var(--font-code, 'JetBrains Mono', monospace)",
    fontSize: "12px",
    color: colors.text.secondary,
  }

  const statusColor = runStatus === "running"
    ? colors.status.ahead
    : runStatus === "error"
    ? colors.status.behind
    : colors.status.synced

  const row = (label: string, val: React.ReactNode): React.ReactNode => (
    <div style={{ display: "flex", gap: space['4'], alignItems: "center", marginBottom: space['2'] }}>
      <span style={labelStyle}>{label}</span>
      <span style={valueStyle}>{val}</span>
    </div>
  )

  return (
    <div style={{ padding: space['6'], height: "100%", overflowY: "auto" }}>
      <div style={headerStyle}>// DASHBOARD</div>

      <Panel rain={{ preset: "diff" }} style={{ padding: space['4'], marginBottom: space['4'] }}>
        {row("STATUS", <span style={{ color: statusColor }}>{runStatus.toUpperCase()}</span>)}
        {row("NEXT RUN", nextRunLabel)}
        {lastReportId && row("LAST REPORT", (
          <span>
            {lastReportId}{" "}
            <Button variant="ghost" size="sm" onClick={() => navigate("/reports")}>View</Button>
          </span>
        ))}

        {runStatus === "running" && (
          <div style={{ marginBottom: space['3'] }}>
            <div style={{ ...labelStyle, marginBottom: space['1'] }}>
              Progress: {progress.done}/{progress.total}
            </div>
            <div style={{ height: "4px", backgroundColor: colors.bg.elevated, border: `1px solid ${colors.border.default}`, borderRadius: "2px", overflow: "hidden", width: "240px" }}>
              <div style={{ height: "100%", width: `${progress.total > 0 ? (progress.done / progress.total) * 100 : 0}%`, backgroundColor: colors.status.synced, transition: "width 0.3s ease" }} />
            </div>
          </div>
        )}

        <div style={{ marginTop: space['3'] }}>
          <Button variant="primary" onClick={handleRunNow} loading={runStatus === "running"}>
            RUN NOW
          </Button>
        </div>
      </Panel>

      <Panel rain={{ preset: "diff" }} style={{ padding: space['4'] }}>
        <div style={{ fontFamily: "var(--font-body, monospace)", fontSize: "11px", color: colors.text.tertiary, lineHeight: "1.8" }}>
          <div>Configure repos and AI engine in Configuration.</div>
          <div>Run Now fetches open PRs where you are a requested reviewer.</div>
          <div>Results are stored as JSON reports and viewable in Reports.</div>
        </div>
      </Panel>
    </div>
  )
}
