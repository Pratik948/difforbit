import React, { useState } from "react"
import { colors, space, textGlow } from "@/styles/tokens"
import type { ReviewIssue } from "@/types/review"
import DiffViewer from "./DiffViewer"
import CommentToggle from "./CommentToggle"

interface IssueCardProps {
  issue: ReviewIssue
  index: number
  onToggleSelected: (index: number, selected: boolean) => void
}

const SEVERITY_COLORS: Record<string, string> = {
  High: colors.status.behind,
  Medium: colors.status.modified,
  Low: colors.status.synced,
  NEEDS_VERIFICATION: colors.status.ahead,
}

export default function IssueCard({ issue, index, onToggleSelected }: IssueCardProps) {
  const [diffOpen, setDiffOpen] = useState(false)

  const sevColor = SEVERITY_COLORS[issue.severity] ?? colors.text.tertiary

  const cardStyle: React.CSSProperties = {
    border: `1px solid ${colors.border.default}`,
    borderLeft: `3px solid ${sevColor}`,
    padding: space['3'],
    marginBottom: space['2'],
    backgroundColor: colors.bg.surface,
  }

  const badgeStyle: React.CSSProperties = {
    display: "inline-block",
    fontFamily: "var(--font-code, monospace)",
    fontSize: "9px",
    letterSpacing: "0.1em",
    color: sevColor,
    border: `1px solid ${sevColor}`,
    padding: `1px ${space['1']}`,
    borderRadius: "2px",
    marginRight: space['2'],
  }

  const catStyle: React.CSSProperties = {
    fontFamily: "var(--font-body, monospace)",
    fontSize: "10px",
    color: colors.text.tertiary,
    marginRight: space['2'],
  }

  const fileStyle: React.CSSProperties = {
    fontFamily: "var(--font-code, monospace)",
    fontSize: "10px",
    color: colors.status.ahead,
  }

  return (
    <div style={cardStyle}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: space['2'], marginBottom: space['2'], flexWrap: "wrap" }}>
        <span style={badgeStyle}>{issue.severity}</span>
        <span style={catStyle}>{issue.category}</span>
        {issue.file && <span style={fileStyle}>{issue.file}{issue.line ? `:${issue.line}` : ""}</span>}
      </div>

      {/* Description */}
      <div style={{ fontFamily: "var(--font-body, monospace)", fontSize: "12px", color: colors.text.secondary, marginBottom: space['2'] }}>
        {issue.description}
      </div>

      {/* Suggested comment */}
      <div style={{
        fontFamily: "var(--font-code, monospace)",
        fontSize: "11px",
        color: colors.text.tertiary,
        backgroundColor: colors.bg.elevated,
        padding: space['2'],
        borderLeft: `2px solid ${colors.border.default}`,
        marginBottom: space['2'],
        whiteSpace: "pre-wrap",
      }}>
        {issue.suggestedComment}
      </div>

      {/* Controls */}
      <div style={{ display: "flex", alignItems: "center", gap: space['4'] }}>
        <CommentToggle
          checked={issue.selected}
          onChange={v => onToggleSelected(index, v)}
          label="Include in review"
        />
        {issue.diffHunk && issue.diffHunk.length > 0 && (
          <button
            onClick={() => setDiffOpen(v => !v)}
            style={{
              fontFamily: "var(--font-body, monospace)",
              fontSize: "10px",
              color: colors.text.tertiary,
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0,
            }}
          >
            {diffOpen ? "▼ Hide diff" : "▶ View diff"}
          </button>
        )}
      </div>

      {diffOpen && issue.diffHunk && <DiffViewer lines={issue.diffHunk} />}
    </div>
  )
}
