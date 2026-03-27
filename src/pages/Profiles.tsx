import React from "react"
import { colors, space, textGlow } from "@matrixui/tokens"
import { Panel } from "@matrixui/react"

export default function Profiles() {
  const pageStyle: React.CSSProperties = { padding: space['6'] }
  const headerStyle: React.CSSProperties = {
    fontFamily: "var(--font-display, 'Share Tech Mono', monospace)",
    fontSize: "20px",
    color: colors.text.primary,
    textShadow: textGlow.greenPrimary,
    marginBottom: space['6'],
    letterSpacing: "0.05em",
  }
  return (
    <div style={pageStyle}>
      <div style={headerStyle}>// PROFILES</div>
      <Panel rain={{ preset: "diff" }} style={{ padding: space['4'] }}>
        <div style={{ fontFamily: "var(--font-body, monospace)", fontSize: "12px", color: colors.text.tertiary }}>
          Profile management coming in Phase 5.
        </div>
      </Panel>
    </div>
  )
}
