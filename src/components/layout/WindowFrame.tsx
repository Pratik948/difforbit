import React from "react"
import { colors } from "@/styles/tokens"

interface WindowFrameProps {
  children: React.ReactNode
}

export default function WindowFrame({ children }: WindowFrameProps) {
  return (
    <div style={{ width: "100vw", height: "100vh", backgroundColor: colors.bg.base, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ height: "36px", flexShrink: 0, backgroundColor: colors.bg.surface, borderBottom: `1px solid ${colors.border.default}`, display: "flex", alignItems: "center", paddingLeft: "16px" }}>
        <span style={{ fontFamily: "var(--font-display, sans-serif)", fontSize: "12px", color: colors.text.primary, letterSpacing: "0.08em" }}>
          DiffOrbit — AI PR Reviewer
        </span>
      </div>
      <div style={{ flex: 1, overflow: "hidden" }}>{children}</div>
    </div>
  )
}
