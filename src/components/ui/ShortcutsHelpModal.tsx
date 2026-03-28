import { Modal } from "@matrixui/react"
import { colors, space } from "@matrixui/tokens"

const SHORTCUTS = [
  { key: "j / k", action: "Navigate between PRCards", section: "Navigation" },
  { key: "i", action: "Expand / collapse focused IssueCard", section: "Navigation" },
  { key: "Space", action: "Toggle expand / collapse", section: "Navigation" },
  { key: "a", action: "Approve focused PR", section: "Actions" },
  { key: "r", action: "Request changes on focused PR", section: "Actions" },
  { key: "p", action: "Post selected comments for focused PR", section: "Actions" },
  { key: "/", action: "Focus search bar (Reports page)", section: "UI" },
  { key: "Esc", action: "Close modal / collapse expanded item", section: "UI" },
  { key: "⌘R", action: "Trigger Run Now", section: "UI" },
  { key: "?", action: "Show this shortcuts panel", section: "UI" },
] as const

type Section = "Navigation" | "Actions" | "UI"
const SECTIONS: Section[] = ["Navigation", "Actions", "UI"]

export function ShortcutsHelpModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const row: React.CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: `${space['2']} ${space['3']}`,
    borderBottom: `1px solid ${colors.border.default}`,
    fontFamily: "var(--font-body)",
    fontSize: "0.82rem",
  }

  const sectionLabel: React.CSSProperties = {
    color: colors.text.tertiary,
    fontFamily: "var(--font-body)",
    fontSize: "0.72rem",
    letterSpacing: "0.1em",
    textTransform: "uppercase" as const,
    padding: `${space['2']} ${space['3']}`,
    borderBottom: `1px solid ${colors.border.default}`,
    background: colors.bg.elevated,
  }

  const keyChip: React.CSSProperties = {
    fontFamily: "var(--font-code)",
    fontSize: "0.78rem",
    background: colors.bg.elevated,
    border: `1px solid ${colors.border.default}`,
    borderRadius: "4px",
    padding: `2px ${space['2']}`,
    color: colors.text.primary,
    minWidth: "5rem",
    textAlign: "center" as const,
  }

  return (
    <Modal open={open} onClose={onClose} title="Keyboard Shortcuts" size="sm">
      <div style={{ border: `1px solid ${colors.border.default}`, borderRadius: "6px", overflow: "hidden" }}>
        {SECTIONS.map(section => (
          <div key={section}>
            <div style={sectionLabel}>{section}</div>
            {SHORTCUTS.filter(s => s.section === section).map(({ key, action }, i) => (
              <div key={key} style={{ ...row, background: i % 2 === 0 ? colors.bg.surface : "transparent" }}>
                <span style={keyChip}>{key}</span>
                <span style={{ color: colors.text.secondary }}>{action}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
      <p style={{ color: colors.text.tertiary, fontFamily: "var(--font-body)", fontSize: "0.78rem", marginTop: space['3'], textAlign: "center" as const }}>
        Shortcuts are disabled when a text input or modal is focused.
      </p>
    </Modal>
  )
}
