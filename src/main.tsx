import { injectMatrixUITokens } from "@matrixui/tokens"
injectMatrixUITokens()

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
