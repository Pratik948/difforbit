import { injectMatrixUITokens } from "@matrixui/tokens"
injectMatrixUITokens()

// Apply saved theme before first render to avoid flash of matrix theme
import { applyTheme } from "@/styles/themes"
import type { ThemeId } from "@/styles/themes"
try {
  const raw = localStorage.getItem("difforbit-theme") as ThemeId | null
  applyTheme(raw ?? "shadcn-light")
} catch {
  applyTheme("shadcn-light")
}

import React from "react"
import ReactDOM from "react-dom/client"
import { MemoryRouter } from "react-router-dom"
import { ToastProvider } from "@matrixui/react"
import App from "./App"

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <MemoryRouter>
      <ToastProvider>
        <App />
      </ToastProvider>
    </MemoryRouter>
  </React.StrictMode>
)
