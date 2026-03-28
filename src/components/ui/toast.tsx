import React, { createContext, useContext, useState, useCallback } from "react"
import { createPortal } from "react-dom"

interface Toast {
  id: number
  variant: "success" | "error" | "info"
  message: string
}

interface ToastCtx {
  addToast: (t: Omit<Toast, "id">) => void
}

const Ctx = createContext<ToastCtx>({ addToast: () => {} })

export function useToast() {
  return useContext(Ctx)
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  let nextId = 0

  const addToast = useCallback((t: Omit<Toast, "id">) => {
    const id = ++nextId
    setToasts(prev => [...prev, { ...t, id }])
    setTimeout(() => setToasts(prev => prev.filter(x => x.id !== id)), 3500)
  }, [])

  const colors: Record<Toast["variant"], string> = {
    success: "var(--do-success)",
    error:   "var(--do-danger)",
    info:    "var(--do-text-secondary)",
  }

  return (
    <Ctx.Provider value={{ addToast }}>
      {children}
      {createPortal(
        <div style={{ position: "fixed", bottom: "24px", right: "24px", zIndex: 9999, display: "flex", flexDirection: "column", gap: "8px", maxWidth: "360px" }}>
          {toasts.map(t => (
            <div key={t.id} style={{
              padding: "10px 14px",
              background: "var(--do-bg-elevated)",
              border: `1px solid ${colors[t.variant]}`,
              borderRadius: "4px",
              fontFamily: "var(--font-body, monospace)",
              fontSize: "12px",
              color: colors[t.variant],
            }}>
              {t.message}
            </div>
          ))}
        </div>,
        document.body
      )}
    </Ctx.Provider>
  )
}
