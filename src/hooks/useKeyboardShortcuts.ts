import { useEffect, useCallback } from "react"
import { triggerRunNow } from "@/ipc/review"

export interface ShortcutHandlers {
  onNavigateUp?: () => void      // k
  onNavigateDown?: () => void    // j
  onExpand?: () => void          // i / Space
  onApprove?: () => void         // a
  onRequestChanges?: () => void  // r
  onPostComments?: () => void    // p
  onFocusSearch?: () => void     // /
  onShowHelp?: () => void        // ?
  onEscape?: () => void          // Esc
}

function isInputFocused(): boolean {
  const el = document.activeElement
  if (!el) return false
  const tag = el.tagName.toLowerCase()
  return tag === "input" || tag === "textarea" || tag === "select" || (el as HTMLElement).isContentEditable
}

function isModalOpen(): boolean {
  return !!document.querySelector('[role="dialog"]')
}

export function useKeyboardShortcuts(handlers: ShortcutHandlers) {
  const handle = useCallback((e: KeyboardEvent) => {
    // Never fire shortcuts when typing in an input or modal (except Esc)
    if (e.key !== "Escape" && (isInputFocused() || isModalOpen())) return

    const meta = e.metaKey || e.ctrlKey

    switch (e.key) {
      case "j":
        e.preventDefault()
        handlers.onNavigateDown?.()
        break
      case "k":
        e.preventDefault()
        handlers.onNavigateUp?.()
        break
      case "i":
      case " ":
        if (e.key === " ") e.preventDefault()
        handlers.onExpand?.()
        break
      case "a":
        e.preventDefault()
        handlers.onApprove?.()
        break
      case "r":
        e.preventDefault()
        handlers.onRequestChanges?.()
        break
      case "p":
        e.preventDefault()
        handlers.onPostComments?.()
        break
      case "/":
        e.preventDefault()
        handlers.onFocusSearch?.()
        break
      case "?":
        e.preventDefault()
        handlers.onShowHelp?.()
        break
      case "Escape":
        handlers.onEscape?.()
        break
      case "r":
      case "R":
        if (meta) {
          e.preventDefault()
          triggerRunNow().catch(() => {})
        }
        break
      default:
        break
    }
  }, [handlers])

  useEffect(() => {
    window.addEventListener("keydown", handle)
    return () => window.removeEventListener("keydown", handle)
  }, [handle])
}

// Global shortcut for ? help — no context needed
export function useHelpShortcut(onShow: () => void) {
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === "?" && !isInputFocused()) {
        e.preventDefault()
        onShow()
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [onShow])
}
