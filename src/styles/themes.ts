// Theme definitions — each theme injects CSS vars into :root AND
// overrides MatrixUI component inline styles via data-matrixui-* selectors.
//
// Why !important overrides?
// MatrixUI components use inline JS styles (e.g. backgroundColor: "#000a00").
// CSS vars cannot override inline styles, but CSS !important rules can
// when targeting the data-matrixui-* attributes present on every component.

export type ThemeId = "matrix" | "shadcn-dark" | "shadcn-light"

export interface ThemeMeta {
  id: ThemeId
  label: string
  description: string
  preview: { bg: string; surface: string; text: string; accent: string }
}

// --do-* semantic vars used by our own components + App.tsx layout
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
  "--do-rain-visible": string
  // These override --font-* vars that MatrixUI components DO reference via var()
  "--font-display": string
  "--font-body": string
  "--font-code": string
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
    "--do-rain-visible":   "block",
    "--font-display":      "'Share Tech Mono', 'Courier New', monospace",
    "--font-body":         "'Courier New', 'Lucida Console', monospace",
    "--font-code":         "'JetBrains Mono', 'Fira Code', monospace",
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
    "--do-rain-visible":   "none",
    "--font-display":      "'Inter', 'SF Pro Display', system-ui, sans-serif",
    "--font-body":         "'Inter', 'SF Pro Text', system-ui, sans-serif",
    "--font-code":         "'JetBrains Mono', 'Fira Code', monospace",
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
    "--do-rain-visible":   "none",
    "--font-display":      "'Inter', 'SF Pro Display', system-ui, sans-serif",
    "--font-body":         "'Inter', 'SF Pro Text', system-ui, sans-serif",
    "--font-code":         "'JetBrains Mono', 'Fira Code', monospace",
  },
}

// CSS !important overrides for MatrixUI component inline styles.
// Keyed by theme — matrix needs none since MatrixUI defaults match.
const COMPONENT_OVERRIDES: Partial<Record<ThemeId, string>> = {
  "shadcn-dark": buildOverrides({
    bg:        "hsl(240 3.7% 10%)",
    bgElevated: "hsl(240 3.7% 15.9%)",
    text:      "hsl(0 0% 98%)",
    textMuted: "hsl(240 5% 64.9%)",
    border:    "hsl(240 3.7% 15.9%)",
    inputBg:   "hsl(240 3.7% 12%)",
    danger:    "hsl(0 84.2% 60.2%)",
    success:   "hsl(142 76% 36%)",
  }),
  "shadcn-light": buildOverrides({
    bg:        "hsl(0 0% 100%)",
    bgElevated: "hsl(0 0% 96.1%)",
    text:      "hsl(240 10% 3.9%)",
    textMuted: "hsl(240 3.8% 46.1%)",
    border:    "hsl(240 5.9% 90%)",
    inputBg:   "hsl(0 0% 100%)",
    danger:    "hsl(0 84.2% 60.2%)",
    success:   "hsl(142 76% 36%)",
  }),
}

function buildOverrides(c: {
  bg: string; bgElevated: string; text: string; textMuted: string
  border: string; inputBg: string; danger: string; success: string
}): string {
  return `
    /* Hide MatrixRain */
    [data-matrixui-matrix-rain] { display: none !important; }

    /* Panel — override dark surface + transparent overlay child */
    [data-matrixui-panel] {
      background-color: ${c.bg} !important;
      border-color: ${c.border} !important;
    }
    [data-matrixui-panel] > div:first-child {
      background-color: transparent !important;
    }

    /* Sidebar */
    [data-matrixui-sidebar] {
      background-color: ${c.bgElevated} !important;
      border-color: ${c.border} !important;
    }

    /* All text inside MatrixUI components */
    [data-matrixui-panel] *,
    [data-matrixui-sidebar] *,
    [data-matrixui-modal] * {
      color: ${c.text} !important;
    }

    /* Restore danger/success colours that shouldn't be overridden */
    [data-matrixui-panel] [style*="ff4444"],
    [data-matrixui-panel] [style*="red"] { color: ${c.danger} !important; }
    [data-matrixui-panel] [style*="00ff41"],
    [data-matrixui-panel] [style*="00cc44"] { color: ${c.success} !important; }

    /* Input */
    [data-matrixui-input] {
      background: ${c.inputBg} !important;
      color: ${c.text} !important;
      border-color: ${c.border} !important;
    }

    /* Modal backdrop + surface */
    [data-matrixui-modal] {
      background: rgba(0,0,0,0.4) !important;
    }
    [data-matrixui-modal] > div {
      background-color: ${c.bg} !important;
      border-color: ${c.border} !important;
    }

    /* Buttons — keep the primary/danger colours legible */
    [data-matrixui-button] {
      background: ${c.bgElevated} !important;
      color: ${c.text} !important;
      border-color: ${c.border} !important;
    }
  `
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

  // 1. Set --do-* and --font-* CSS vars
  for (const [key, value] of Object.entries(vars)) {
    root.style.setProperty(key, value)
  }
  root.setAttribute("data-theme", id)

  // 2. Inject/remove !important component overrides
  const STYLE_ID = "do-theme-overrides"
  let el = document.getElementById(STYLE_ID) as HTMLStyleElement | null
  const overrides = COMPONENT_OVERRIDES[id]
  if (overrides) {
    if (!el) {
      el = document.createElement("style")
      el.id = STYLE_ID
      document.head.appendChild(el)
    }
    // Scope every rule under [data-theme="<id>"] so switching back to matrix clears them
    const scoped = overrides.replace(/^\s+(\[data-matrixui)/gm, `    [data-theme="${id}"] $1`)
    el.textContent = scoped
  } else {
    el?.remove()
  }
}
