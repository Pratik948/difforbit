import React from "react"
import { colors, space } from "@/styles/tokens"

interface VerdictBadgeProps {
  verdict: "APPROVE" | "REQUEST_CHANGES" | "NEEDS_DISCUSSION"
}

const VERDICT_CONFIG = {
  APPROVE: { label: "APPROVE", color: colors.status.synced, bg: "rgba(0,255,65,0.08)" },
  REQUEST_CHANGES: { label: "REQUEST CHANGES", color: colors.status.behind, bg: "rgba(255,58,58,0.08)" },
  NEEDS_DISCUSSION: { label: "NEEDS DISCUSSION", color: colors.status.modified, bg: "rgba(255,215,0,0.08)" },
}

export default function VerdictBadge({ verdict }: VerdictBadgeProps) {
  const cfg = VERDICT_CONFIG[verdict] ?? VERDICT_CONFIG.NEEDS_DISCUSSION
  return (
    <span style={{
      fontFamily: "var(--font-code, 'JetBrains Mono', monospace)",
      fontSize: "10px",
      fontWeight: "bold",
      letterSpacing: "0.1em",
      color: cfg.color,
      backgroundColor: cfg.bg,
      border: `1px solid ${cfg.color}`,
      padding: `${space['0.5']} ${space['2']}`,
      borderRadius: "2px",
    }}>
      {cfg.label}
    </span>
  )
}
