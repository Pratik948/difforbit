import { useRef, useEffect } from "react"
import { Input } from "@/components/ui"
import { colors, space } from "@/styles/tokens"

interface Props {
  value: string
  onChange: (v: string) => void
  focusRef?: React.RefObject<HTMLInputElement | null>
}

export function SearchBar({ value, onChange, focusRef }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)

  // Expose focus handle to parent (used by "/" shortcut)
  useEffect(() => {
    if (focusRef && "current" in focusRef) {
      (focusRef as React.MutableRefObject<HTMLInputElement | null>).current = inputRef.current
    }
  })

  return (
    <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
      <span style={{
        position: "absolute",
        left: space['3'],
        color: colors.text.tertiary,
        fontFamily: "var(--font-body)",
        fontSize: "0.85rem",
        pointerEvents: "none",
        zIndex: 1,
      }}>
        /
      </span>
      <input
        ref={inputRef}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="Search by PR title, repo, or author…"
        style={{
          background: colors.bg.surface,
          border: `1px solid ${value ? colors.status.synced : colors.border.default}`,
          borderRadius: "6px",
          color: colors.text.primary,
          fontFamily: "var(--font-body)",
          fontSize: "0.85rem",
          padding: `${space['2']} ${space['3']} ${space['2']} ${space['6']}`,
          width: "100%",
          outline: "none",
          transition: "border-color 0.15s",
        }}
        onFocus={e => { e.target.style.borderColor = colors.status.synced }}
        onBlur={e => { e.target.style.borderColor = value ? colors.status.synced : colors.border.default }}
      />
      {value && (
        <button
          onClick={() => onChange("")}
          style={{
            position: "absolute",
            right: space['3'],
            background: "none",
            border: "none",
            color: colors.text.tertiary,
            cursor: "pointer",
            fontFamily: "var(--font-body)",
            fontSize: "0.85rem",
            padding: 0,
          }}
        >
          ✕
        </button>
      )}
    </div>
  )
}
