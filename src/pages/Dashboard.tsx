import React, { useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { colors, space, textGlow } from "@matrixui/tokens"
import { Panel, Button } from "@matrixui/react"
import { useReviewStore } from "@/store/reviewStore"
import { useTauriEvents } from "@/hooks/useTauriEvents"
import { triggerRunNow } from "@/ipc/review"

export default function Dashboard() {
  const { runStatus, progress, lastReportId } = useReviewStore()
  const navigate = useNavigate()
  useTauriEvents()

  const handleRunNow = async () => {
    try {
      await triggerRunNow()
    } catch (e) {
      console.error(e)
    }
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
  }

  const valueStyle: React.CSSProperties = {
    fontFamily: "var(--font-code, 'JetBrains Mono', monospace)",
    fontSize: "13px",
  }

  const statusColor = runStatus === "running"
    ? colors.status.ahead
    : runStatus === "error"
    ? colors.status.behind
    : colors.status.synced

  return (
    <div style={{ padding: space['6'], height: "100%", overflowY: "auto" }}>
      <div style={headerStyle}>// DASHBOARD</div>

      {/* Status panel */}
      <Panel rain={{ preset: "diff" }} style={{ padding: space['4'], marginBottom: space['4'] }}>
        <div style={{ display: "flex", flexDirection: "column", gap: space['2'] }}>
          <div style={{ display: "flex", gap: space['4'], alignItems: "center" }}>
            <span style={labelStyle}>STATUS</span>
            <span style={{ ...valueStyle, color: statusColor }}>
              {runStatus === "running" ? "⬛ RUNNING" : runStatus === "error" ? "✗ ERROR" : "● IDLE"}
            </span>
          </div>

          {runStatus === "running" && (
            <div>
              <div style={{ ...labelStyle, marginBottom: space['1'] }}>
                Progress: {progress.done}/{progress.total}
              </div>
              <div style={{
                height: "4px",
                backgroundColor: colors.bg.elevated,
                border: `1px solid ${colors.border.default}`,
                borderRadius: "2px",
                overflow: "hidden",
                width: "240px",
              }}>
                <div style={{
                  height: "100%",
                  width: `${progress.total > 0 ? (progress.done / progress.total) * 100 : 0}%`,
                  backgroundColor: colors.status.synced,
                  transition: "width 0.3s ease",
                }} />
              </div>
            </div>
          )}

          {lastReportId && (
            <div style={{ display: "flex", gap: space['3'], alignItems: "center" }}>
              <span style={labelStyle}>LAST REPORT</span>
              <span style={{ ...valueStyle, color: colors.text.secondary }}>{lastReportId}</span>
              <Button variant="ghost" size="sm" onClick={() => navigate("/reports")}>View</Button>
            </div>
          )}

          <div style={{ marginTop: space['2'] }}>
            <Button
              variant="primary"
              onClick={handleRunNow}
              loading={runStatus === "running"}
            >
              RUN NOW
            </Button>
          </div>
        </div>
      </Panel>

      {/* Quick info */}
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
