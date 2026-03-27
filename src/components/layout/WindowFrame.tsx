import React from "react"
import { colors } from "@matrixui/tokens"
import { MatrixRain } from "@matrixui/react"

interface WindowFrameProps {
  children: React.ReactNode
}

export default function WindowFrame({ children }: WindowFrameProps) {
  const frameStyle: React.CSSProperties = {
    width: "100vw",
    height: "100vh",
    backgroundColor: colors.bg.base,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    position: "relative",
  }

  const headerStyle: React.CSSProperties = {
    height: "36px",
    flexShrink: 0,
    position: "relative",
    overflow: "hidden",
    backgroundColor: colors.bg.surface,
    borderBottom: `1px solid ${colors.border.default}`,
    display: "flex",
    alignItems: "center",
    paddingLeft: "16px",
  }

  const titleStyle: React.CSSProperties = {
    fontFamily: "var(--font-display, 'Share Tech Mono', monospace)",
    fontSize: "12px",
    color: colors.text.primary,
    letterSpacing: "0.1em",
    position: "relative",
    zIndex: 1,
  }

  return (
    <div style={frameStyle}>
      <div style={headerStyle}>
        <MatrixRain preset="titlebar" />
        <span style={titleStyle}>DIFFORBIT // AI PR REVIEWER</span>
      </div>
      <div style={{ flex: 1, overflow: "hidden" }}>
        {children}
      </div>
    </div>
  )
}
