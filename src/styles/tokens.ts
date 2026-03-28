// Drop-in replacement for @matrixui/tokens.
// Returns CSS var references so all theme vars resolve at render time.

export const colors = {
  text: {
    primary:   "var(--do-text-primary)",
    secondary:  "var(--do-text-secondary)",
    tertiary:   "var(--do-text-tertiary)",
    ghost:      "var(--do-text-ghost)",
    muted:      "var(--do-text-tertiary)",
    dim:        "var(--do-text-ghost)",
  },
  bg: {
    base:     "var(--do-bg-base)",
    surface:  "var(--do-bg-surface)",
    elevated: "var(--do-bg-elevated)",
    input:    "var(--do-bg-input)",
    overlay:  "var(--do-bg-overlay)",
    modal:    "var(--do-bg-modal)",
  },
  border: {
    subtle:  "var(--do-border-subtle)",
    default: "var(--do-border)",
    strong:  "var(--do-border)",
    active:  "var(--do-border-active)",
    danger:  "var(--do-danger)",
    cyan:    "var(--do-accent-cyan)",
    cyanActive: "var(--do-accent-cyan)",
  },
  status: {
    synced:    "var(--do-success)",
    ahead:     "var(--do-accent-cyan)",
    behind:    "var(--do-danger)",
    modified:  "var(--do-warning)",
    conflict:  "var(--do-danger)",
    untracked: "var(--do-text-ghost)",
  },
  diff: {
    addedBg:     "var(--do-diff-added-bg)",
    addedBorder: "var(--do-success)",
    addedText:   "var(--do-success)",
    removedBg:   "var(--do-diff-removed-bg)",
    removedBorder: "var(--do-danger)",
    removedText: "var(--do-danger)",
    neutralText: "var(--do-text-tertiary)",
  },
  interactive: {
    primaryBg: "transparent",
    ghostBg:   "transparent",
    dangerBg:  "transparent",
    cyanBg:    "transparent",
  },
}

export const space: Record<string, string> = {
  "0":  "0px",
  "1":  "4px",
  "2":  "8px",
  "3":  "12px",
  "4":  "16px",
  "5":  "20px",
  "6":  "24px",
  "8":  "32px",
  "10": "40px",
  "12": "48px",
}

export const textGlow = {
  none:         "none",
  greenSubtle:  "var(--do-text-glow-subtle)",
  greenSoft:    "var(--do-text-glow)",
  greenPrimary: "var(--do-text-glow)",
  greenStrong:  "var(--do-text-glow)",
}
