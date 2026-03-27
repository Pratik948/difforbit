import React from "react"
import { colors, space } from "@matrixui/tokens"
import type { DiffLine } from "@/types/review"

interface DiffViewerProps {
  lines: DiffLine[]
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

export default function DiffViewer({ lines }: DiffViewerProps) {
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
            const st = LINE_STYLES[dl.type] ?? LINE_STYLES.context
            return (
              <tr key={i} style={st}>
                <td style={{ width: "32px", textAlign: "right", padding: `0 ${space['1']}`, color: colors.text.ghost, userSelect: "none", borderRight: `1px solid ${colors.border.default}`, fontSize: "10px" }}>
                  {dl.line ?? ""}
                </td>
                <td style={{ width: "16px", textAlign: "center", padding: `0 ${space['1']}`, color: st.color, userSelect: "none", borderRight: `1px solid ${colors.border.default}` }}>
                  {GUTTER[dl.type] ?? " "}
                </td>
                <td style={{ padding: `0 ${space['2']}`, whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
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
