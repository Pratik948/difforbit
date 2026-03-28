import { useEffect } from "react"
import { applyTheme } from "@/styles/themes"
import type { ThemeId } from "@/styles/themes"

export function useTheme(theme: ThemeId) {
  useEffect(() => {
    applyTheme(theme)
    try { localStorage.setItem("difforbit-theme", theme) } catch { /* noop */ }
  }, [theme])
}
