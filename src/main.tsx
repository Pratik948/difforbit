import { applyTheme } from "@/styles/themes"
import type { ThemeId } from "@/styles/themes"

// Apply saved theme before first render to avoid flash
try {
  const saved = localStorage.getItem("difforbit-theme") as ThemeId | null
  applyTheme(saved ?? "shadcn-light")
} catch {
  applyTheme("shadcn-light")
}

import React from "react"
import ReactDOM from "react-dom/client"
import { MemoryRouter } from "react-router-dom"
import { ToastProvider } from "@/components/ui"
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
