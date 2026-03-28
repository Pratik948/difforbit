import React, { useEffect } from "react"
import { createPortal } from "react-dom"

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  size?: "sm" | "md" | "lg"
  children: React.ReactNode
}

const widths = { sm: "400px", md: "560px", lg: "720px" }

export function Modal({ open, onClose, title, size = "md", children }: ModalProps) {
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div
      style={{ position: "fixed", inset: 0, zIndex: 500, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        background: "var(--do-bg-surface)",
        border: "1px solid var(--do-border)",
        borderRadius: "6px",
        padding: "24px",
        width: "90%",
        maxWidth: widths[size],
        maxHeight: "80vh",
        overflowY: "auto",
        position: "relative",
      }}>
        {title && (
          <div style={{ fontFamily: "var(--font-display, monospace)", fontSize: "14px", color: "var(--do-text-primary)", marginBottom: "16px", paddingBottom: "8px", borderBottom: "1px solid var(--do-border)" }}>
            {title}
          </div>
        )}
        {children}
      </div>
    </div>,
    document.body
  )
}
