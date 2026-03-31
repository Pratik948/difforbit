import React from "react"
import { colors, space } from "@/styles/tokens"
import type { DiffLine } from "@/types/review"

interface DiffViewerProps {
  lines: DiffLine[]
  targetLine?: number | undefined
}

const LINE_STYLES: Record<string, React.CSSProperties> = {
  add: { backgroundColor: colors.diff.addedBg, color: colors.diff.addedText },
  remove: { backgroundColor: colors.diff.removedBg, color: colors.diff.removedText },
  context: { backgroundColor: "transparent", color: colors.text.tertiary },
  hunk: { backgroundColor: colors.bg.elevated, color: colors.status.ahead, fontStyle: "italic" },
}

const GUTTER: Record<string, string> = {
  add: "+",
  remove: "−",
  context: " ",
  hunk: "@",
}

export default function DiffViewer({ lines, targetLine }: DiffViewerProps) {
  if (!lines || lines.length === 0) return null

  const containerStyle: React.CSSProperties = {
    fontFamily: "var(--font-code, 'JetBrains Mono', monospace)",
    fontSize: "11px",
    lineHeight: "1.5",
    overflow: "auto",
    border: `1px solid ${colors.border.default}`,
    borderRadius: "2px",
    marginTop: space['2'],
  }

  return (
    <div style={containerStyle}>
      <table style={{ borderCollapse: "collapse", width: "100%", tableLayout: "fixed" }}>
        <tbody>
          {lines.map((dl, i) => {
            const isTarget = targetLine != null && dl.line === targetLine
            const base = LINE_STYLES[dl.type] ?? LINE_STYLES.context
            const st: React.CSSProperties = isTarget
              ? { ...base, backgroundColor: `${colors.status.modified}22`, outline: `1px solid ${colors.status.modified}66` }
              : base
            return (
              <tr key={i} style={st}>
                <td style={{ width: "32px", textAlign: "right", padding: `0 ${space['1']}`, color: isTarget ? colors.status.modified : colors.text.ghost, userSelect: "none", borderRight: `1px solid ${colors.border.default}`, fontSize: "10px", fontWeight: isTarget ? "700" : undefined }}>
                  {dl.line ?? ""}
                </td>
                <td style={{ width: "16px", textAlign: "center", padding: `0 ${space['1']}`, color: st.color, userSelect: "none", borderRight: `1px solid ${colors.border.default}` }}>
                  {isTarget ? "▶" : (GUTTER[dl.type] ?? " ")}
                </td>
                <td style={{ padding: `0 ${space['2']}`, whiteSpace: "pre-wrap", wordBreak: "break-all", fontWeight: isTarget ? "600" : undefined }}>
                  {dl.text}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
