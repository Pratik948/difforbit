import React, { useState } from "react"
import { colors, space } from "@/styles/tokens"
import type { ReviewIssue } from "@/types/review"
import DiffViewer from "./DiffViewer"
import CommentToggle from "./CommentToggle"

interface IssueCardProps {
  issue: ReviewIssue
  index: number
  onToggleSelected: (index: number, selected: boolean) => void
  onEditComment: (index: number, text: string) => void
}

const SEVERITY_COLORS: Record<string, string> = {
  High: colors.status.behind,
  Medium: colors.status.modified,
  Low: colors.status.synced,
  NEEDS_VERIFICATION: colors.status.ahead,
}

export default function IssueCard({ issue, index, onToggleSelected, onEditComment }: IssueCardProps) {
  const [diffOpen, setDiffOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editText, setEditText] = useState(issue.suggestedComment)

  const sevColor = SEVERITY_COLORS[issue.severity] ?? colors.text.tertiary

  const cardStyle: React.CSSProperties = {
    border: `1px solid ${colors.border.default}`,
    borderLeft: `3px solid ${sevColor}`,
    borderRadius: "4px",
    padding: space["3"],
    marginBottom: space["2"],
    backgroundColor: colors.bg.surface,
  }

  const badgeStyle: React.CSSProperties = {
    display: "inline-block",
    fontFamily: "var(--font-code, monospace)",
    fontSize: "10px",
    fontWeight: "600",
    color: sevColor,
    border: `1px solid ${sevColor}`,
    padding: `1px ${space["1"]}`,
    borderRadius: "3px",
    marginRight: space["2"],
  }

  const catStyle: React.CSSProperties = {
    fontFamily: "var(--font-body, system-ui, sans-serif)",
    fontSize: "11px",
    color: colors.text.tertiary,
    marginRight: space["2"],
  }

  const fileStyle: React.CSSProperties = {
    fontFamily: "var(--font-code, monospace)",
    fontSize: "11px",
    color: colors.status.ahead,
  }

  return (
    <div style={cardStyle}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: space["2"], marginBottom: space["2"], flexWrap: "wrap" }}>
        <span style={badgeStyle}>{issue.severity}</span>
        <span style={catStyle}>{issue.category}</span>
        {issue.file && <span style={fileStyle}>{issue.file}{issue.line ? `:${issue.line}` : ""}</span>}
      </div>

      {/* Description */}
      <div style={{ fontFamily: "var(--font-body, system-ui, sans-serif)", fontSize: "13px", color: colors.text.secondary, marginBottom: space["2"] }}>
        {issue.description}
      </div>

      {/* Suggested comment */}
      {editing ? (
        <div style={{ marginBottom: space["2"] }}>
          <textarea
            value={editText}
            onChange={e => setEditText(e.target.value)}
            rows={4}
            style={{
              width: "100%",
              fontFamily: "var(--font-code, monospace)",
              fontSize: "12px",
              backgroundColor: colors.bg.elevated,
              color: colors.text.secondary,
              border: `1px solid ${colors.status.ahead}`,
              borderRadius: "4px",
              padding: space["2"],
              resize: "vertical",
              boxSizing: "border-box",
            }}
          />
          <div style={{ display: "flex", gap: space["2"], marginTop: space["1"] }}>
            <button
              onClick={() => { onEditComment(index, editText); setEditing(false) }}
              style={{ fontFamily: "var(--font-body, system-ui, sans-serif)", fontSize: "11px", color: colors.status.synced, background: "none", border: `1px solid ${colors.status.synced}`, borderRadius: "3px", padding: `2px ${space["2"]}`, cursor: "pointer" }}
            >
              Save
            </button>
            <button
              onClick={() => { setEditText(issue.suggestedComment); setEditing(false) }}
              style={{ fontFamily: "var(--font-body, system-ui, sans-serif)", fontSize: "11px", color: colors.text.tertiary, background: "none", border: `1px solid ${colors.border.default}`, borderRadius: "3px", padding: `2px ${space["2"]}`, cursor: "pointer" }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div style={{ position: "relative", marginBottom: space["2"] }}>
          <div style={{
            fontFamily: "var(--font-code, monospace)",
            fontSize: "12px",
            color: colors.text.tertiary,
            backgroundColor: colors.bg.elevated,
            padding: space["2"],
            paddingRight: "44px",
            borderLeft: `2px solid ${colors.border.default}`,
            borderRadius: "0 4px 4px 0",
            whiteSpace: "pre-wrap",
          }}>
            {issue.suggestedComment}
          </div>
          <button
            onClick={() => { setEditText(issue.suggestedComment); setEditing(true) }}
            title="Edit comment"
            style={{
              position: "absolute", top: space["1"], right: space["1"],
              fontFamily: "var(--font-body, system-ui, sans-serif)", fontSize: "10px",
              color: colors.text.tertiary, background: "none",
              border: `1px solid ${colors.border.default}`, borderRadius: "3px",
              padding: `1px ${space["1"]}`, cursor: "pointer",
            }}
          >
            edit
          </button>
        </div>
      )}

      {/* Controls */}
      <div style={{ display: "flex", alignItems: "center", gap: space["4"] }}>
        <CommentToggle
          checked={issue.selected}
          onChange={v => onToggleSelected(index, v)}
          label="Include in review"
        />
        {issue.diffHunk && issue.diffHunk.length > 0 && (
          <button
            onClick={() => setDiffOpen(v => !v)}
            style={{
              fontFamily: "var(--font-body, system-ui, sans-serif)",
              fontSize: "12px",
              color: colors.text.tertiary,
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0,
              textDecoration: "underline",
            }}
          >
            {diffOpen ? "Hide diff" : "View diff"}
          </button>
        )}
      </div>

      {diffOpen && issue.diffHunk && <DiffViewer lines={issue.diffHunk} targetLine={issue.line ?? undefined} />}
    </div>
  )
}
