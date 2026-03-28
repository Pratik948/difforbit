// Theme definitions — injects --do-* CSS vars into :root.
// All UI components reference var(--do-*) so themes work natively.

export type ThemeId = "matrix" | "shadcn-dark" | "shadcn-light"

export interface ThemeMeta {
  id: ThemeId
  label: string
  description: string
  preview: { bg: string; surface: string; text: string; accent: string }
}

interface ThemeVars {
  // Backgrounds
  "--do-bg-base": string
  "--do-bg-surface": string
  "--do-bg-elevated": string
  "--do-bg-input": string
  "--do-bg-overlay": string
  "--do-bg-modal": string
  // Text
  "--do-text-primary": string
  "--do-text-secondary": string
  "--do-text-tertiary": string
  "--do-text-ghost": string
  // Borders
  "--do-border-subtle": string
  "--do-border": string
  "--do-border-active": string
  // Semantic
  "--do-accent": string
  "--do-accent-muted": string
  "--do-accent-cyan": string
  "--do-danger": string
  "--do-warning": string
  "--do-success": string
  // Diff
  "--do-diff-added-bg": string
  "--do-diff-removed-bg": string
  // Glow (none for non-matrix)
  "--do-text-glow": string
  "--do-text-glow-subtle": string
  // Fonts (components reference these via var())
  "--font-display": string
  "--font-body": string
  "--font-code": string
}

const THEMES: Record<ThemeId, ThemeVars> = {
  matrix: {
    "--do-bg-base":          "#000000",
    "--do-bg-surface":       "#000a00",
    "--do-bg-elevated":      "#001200",
    "--do-bg-input":         "rgba(0,18,0,0.60)",
    "--do-bg-overlay":       "rgba(0,10,0,0.72)",
    "--do-bg-modal":         "rgba(0,8,0,0.94)",
    "--do-text-primary":     "#00ff41",
    "--do-text-secondary":   "#00cc44",
    "--do-text-tertiary":    "#00aa33",
    "--do-text-ghost":       "#006600",
    "--do-border-subtle":    "#001a00",
    "--do-border":           "#002800",
    "--do-border-active":    "#00ff41",
    "--do-accent":           "#00ff41",
    "--do-accent-muted":     "#006600",
    "--do-accent-cyan":      "#00cccc",
    "--do-danger":           "#ff4444",
    "--do-warning":          "#ffcc00",
    "--do-success":          "#00ff41",
    "--do-diff-added-bg":    "rgba(0,255,65,0.08)",
    "--do-diff-removed-bg":  "rgba(255,40,0,0.08)",
    "--do-text-glow":        "0 0 8px rgba(0,255,65,0.60)",
    "--do-text-glow-subtle": "0 0 4px rgba(0,255,65,0.20)",
    "--font-display":        "'Share Tech Mono', 'Courier New', monospace",
    "--font-body":           "'Courier New', 'Lucida Console', monospace",
    "--font-code":           "'JetBrains Mono', 'Fira Code', monospace",
  },
  "shadcn-dark": {
    // shadcn/ui zinc dark — https://ui.shadcn.com/themes
    "--do-bg-base":          "hsl(240 10% 3.9%)",
    "--do-bg-surface":       "hsl(240 10% 3.9%)",
    "--do-bg-elevated":      "hsl(240 3.7% 15.9%)",
    "--do-bg-input":         "hsl(240 3.7% 15.9%)",
    "--do-bg-overlay":       "rgba(0,0,0,0.6)",
    "--do-bg-modal":         "hsl(240 10% 3.9%)",
    "--do-text-primary":     "hsl(0 0% 98%)",
    "--do-text-secondary":   "hsl(240 5% 64.9%)",
    "--do-text-tertiary":    "hsl(240 3.8% 46.1%)",
    "--do-text-ghost":       "hsl(240 3.7% 32%)",
    "--do-border-subtle":    "hsl(240 3.7% 12%)",
    "--do-border":           "hsl(240 3.7% 15.9%)",
    "--do-border-active":    "hsl(240 4.9% 83.9%)",
    "--do-accent":           "hsl(0 0% 98%)",       // shadcn dark primary — near white
    "--do-accent-muted":     "hsl(240 3.7% 25%)",
    "--do-accent-cyan":      "hsl(198 93% 60%)",    // standard info blue
    "--do-danger":           "hsl(0 62.8% 30.6%)",  // shadcn dark destructive
    "--do-warning":          "hsl(38 92% 50%)",
    "--do-success":          "hsl(142 69% 58%)",    // softer green for dark bg
    "--do-diff-added-bg":    "rgba(34,197,94,0.10)",
    "--do-diff-removed-bg":  "rgba(239,68,68,0.10)",
    "--do-text-glow":        "none",
    "--do-text-glow-subtle": "none",
    "--font-display":        "'Inter', 'SF Pro Display', system-ui, sans-serif",
    "--font-body":           "'Inter', 'SF Pro Text', system-ui, sans-serif",
    "--font-code":           "'JetBrains Mono', 'Fira Code', monospace",
  },
  "shadcn-light": {
    // shadcn/ui zinc light — https://ui.shadcn.com/themes
    "--do-bg-base":          "hsl(0 0% 100%)",
    "--do-bg-surface":       "hsl(0 0% 98%)",
    "--do-bg-elevated":      "hsl(240 4.8% 95.9%)",
    "--do-bg-input":         "hsl(0 0% 100%)",
    "--do-bg-overlay":       "rgba(0,0,0,0.4)",
    "--do-bg-modal":         "hsl(0 0% 100%)",
    "--do-text-primary":     "hsl(240 10% 3.9%)",
    "--do-text-secondary":   "hsl(240 3.8% 46.1%)",
    "--do-text-tertiary":    "hsl(240 3.8% 60%)",
    "--do-text-ghost":       "hsl(240 3.7% 78%)",
    "--do-border-subtle":    "hsl(240 5.9% 95%)",
    "--do-border":           "hsl(240 5.9% 90%)",
    "--do-border-active":    "hsl(240 5.9% 10%)",
    "--do-accent":           "hsl(240 5.9% 10%)",   // shadcn light primary — near black
    "--do-accent-muted":     "hsl(240 4.8% 85%)",
    "--do-accent-cyan":      "hsl(198 93% 40%)",    // standard info blue for light bg
    "--do-danger":           "hsl(0 84.2% 60.2%)",  // shadcn light destructive
    "--do-warning":          "hsl(38 92% 50%)",
    "--do-success":          "hsl(142 76% 36%)",    // standard success green
    "--do-diff-added-bg":    "rgba(34,197,94,0.10)",
    "--do-diff-removed-bg":  "rgba(239,68,68,0.10)",
    "--do-text-glow":        "none",
    "--do-text-glow-subtle": "none",
    "--font-display":        "'Inter', 'SF Pro Display', system-ui, sans-serif",
    "--font-body":           "'Inter', 'SF Pro Text', system-ui, sans-serif",
    "--font-code":           "'JetBrains Mono', 'Fira Code', monospace",
  },
}

export const THEME_META: ThemeMeta[] = [
  {
    id: "matrix",
    label: "Matrix",
    description: "Digital rain, monospace, green on black",
    preview: { bg: "#000000", surface: "#000a00", text: "#00ff41", accent: "#00ff41" },
  },
  {
    id: "shadcn-dark",
    label: "Shadcn Dark",
    description: "Neutral dark, system fonts, clean UI",
    preview: { bg: "hsl(240 10% 3.9%)", surface: "hsl(240 3.7% 10%)", text: "hsl(0 0% 98%)", accent: "hsl(0 0% 98%)" },
  },
  {
    id: "shadcn-light",
    label: "Shadcn Light",
    description: "Clean white, minimal, accessible",
    preview: { bg: "hsl(0 0% 100%)", surface: "hsl(0 0% 96.1%)", text: "hsl(240 10% 3.9%)", accent: "hsl(240 5.9% 10%)" },
  },
]

export function applyTheme(id: ThemeId) {
  const vars = THEMES[id]
  const root = document.documentElement
  for (const [key, value] of Object.entries(vars)) {
    root.style.setProperty(key, value)
  }
  root.setAttribute("data-theme", id)

  // Remove legacy MatrixUI !important override sheet if present
  document.getElementById("do-theme-overrides")?.remove()
}
