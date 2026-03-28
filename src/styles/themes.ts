// Theme definitions — each theme injects CSS vars into :root
// Components reference var(--do-*) for theme-aware values

export type ThemeId = "matrix" | "shadcn-dark" | "shadcn-light"

export interface ThemeMeta {
  id: ThemeId
  label: string
  description: string
  preview: { bg: string; surface: string; text: string; accent: string }
}

interface ThemeVars {
  "--do-bg-base": string
  "--do-bg-surface": string
  "--do-bg-elevated": string
  "--do-text-primary": string
  "--do-text-secondary": string
  "--do-text-tertiary": string
  "--do-border": string
  "--do-border-active": string
  "--do-accent": string
  "--do-accent-muted": string
  "--do-danger": string
  "--do-warning": string
  "--do-success": string
  "--do-font-display": string
  "--do-font-body": string
  "--do-font-code": string
  "--do-rain-visible": string
}

const THEMES: Record<ThemeId, ThemeVars> = {
  matrix: {
    "--do-bg-base":        "#000000",
    "--do-bg-surface":     "#000a00",
    "--do-bg-elevated":    "#001200",
    "--do-text-primary":   "#00ff41",
    "--do-text-secondary": "#00cc44",
    "--do-text-tertiary":  "#00aa33",
    "--do-border":         "#002800",
    "--do-border-active":  "#00ff41",
    "--do-accent":         "#00ff41",
    "--do-accent-muted":   "#006600",
    "--do-danger":         "#ff4444",
    "--do-warning":        "#ffcc00",
    "--do-success":        "#00ff41",
    "--do-font-display":   "'Share Tech Mono', 'Courier New', monospace",
    "--do-font-body":      "'Courier New', 'Lucida Console', monospace",
    "--do-font-code":      "'JetBrains Mono', 'Fira Code', monospace",
    "--do-rain-visible":   "block",
  },
  "shadcn-dark": {
    "--do-bg-base":        "hsl(240 10% 3.9%)",
    "--do-bg-surface":     "hsl(240 3.7% 10%)",
    "--do-bg-elevated":    "hsl(240 3.7% 15.9%)",
    "--do-text-primary":   "hsl(0 0% 98%)",
    "--do-text-secondary": "hsl(240 5% 64.9%)",
    "--do-text-tertiary":  "hsl(240 3.8% 46.1%)",
    "--do-border":         "hsl(240 3.7% 15.9%)",
    "--do-border-active":  "hsl(240 4.9% 83.9%)",
    "--do-accent":         "hsl(0 0% 98%)",
    "--do-accent-muted":   "hsl(240 3.7% 25%)",
    "--do-danger":         "hsl(0 84.2% 60.2%)",
    "--do-warning":        "hsl(38 92% 50%)",
    "--do-success":        "hsl(142 76% 36%)",
    "--do-font-display":   "'Inter', 'SF Pro Display', system-ui, sans-serif",
    "--do-font-body":      "'Inter', 'SF Pro Text', system-ui, sans-serif",
    "--do-font-code":      "'JetBrains Mono', 'Fira Code', monospace",
    "--do-rain-visible":   "none",
  },
  "shadcn-light": {
    "--do-bg-base":        "hsl(0 0% 100%)",
    "--do-bg-surface":     "hsl(0 0% 96.1%)",
    "--do-bg-elevated":    "hsl(0 0% 100%)",
    "--do-text-primary":   "hsl(240 10% 3.9%)",
    "--do-text-secondary": "hsl(240 3.8% 46.1%)",
    "--do-text-tertiary":  "hsl(240 3.7% 65%)",
    "--do-border":         "hsl(240 5.9% 90%)",
    "--do-border-active":  "hsl(240 10% 3.9%)",
    "--do-accent":         "hsl(240 5.9% 10%)",
    "--do-accent-muted":   "hsl(240 4.8% 85%)",
    "--do-danger":         "hsl(0 84.2% 60.2%)",
    "--do-warning":        "hsl(38 92% 50%)",
    "--do-success":        "hsl(142 76% 36%)",
    "--do-font-display":   "'Inter', 'SF Pro Display', system-ui, sans-serif",
    "--do-font-body":      "'Inter', 'SF Pro Text', system-ui, sans-serif",
    "--do-font-code":      "'JetBrains Mono', 'Fira Code', monospace",
    "--do-rain-visible":   "none",
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
}
