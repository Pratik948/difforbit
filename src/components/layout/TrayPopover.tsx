import React from "react"
import { colors, space, textGlow } from "@matrixui/tokens"
import { Panel, Button } from "@matrixui/react"
import { triggerRunNow } from "@/ipc/review"
import { useReviewStore } from "@/store/reviewStore"

export default function TrayPopover() {
  const { runStatus, lastReportId } = useReviewStore()

  const titleStyle: React.CSSProperties = {
    fontFamily: "var(--font-display, 'Share Tech Mono', monospace)",
    fontSize: "13px",
    color: colors.text.primary,
    textShadow: textGlow.greenPrimary,
    marginBottom: space['3'],
  }

  const rowStyle: React.CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    fontFamily: "var(--font-body, monospace)",
    fontSize: "11px",
    color: colors.text.secondary,
    marginBottom: space['2'],
  }

  return (
    <Panel rain={{ preset: "modal" }} style={{ padding: space['4'], minWidth: "280px" }}>
      <div style={titleStyle}>[ DIFFORBIT ]</div>
      <div style={rowStyle}><span>Status:</span><span style={{ color: colors.status.synced }}>{runStatus.toUpperCase()}</span></div>
      <div style={rowStyle}><span>Last run:</span><span>{lastReportId ?? "Never"}</span></div>
      <div style={rowStyle}><span>Next run:</span><span>Not scheduled</span></div>
      <div style={{ display: "flex", gap: space['2'], marginTop: space['3'] }}>
        <Button variant="primary" size="sm" onClick={() => triggerRunNow()} loading={runStatus === "running"}>Run Now</Button>
      </div>
    </Panel>
  )
}
