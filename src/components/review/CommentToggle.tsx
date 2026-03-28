import React from "react"
import { colors, space } from "@/styles/tokens"

interface CommentToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: string
}

export default function CommentToggle({ checked, onChange, label }: CommentToggleProps) {
  return (
    <label style={{
      display: "flex",
      alignItems: "center",
      gap: space['2'],
      cursor: "pointer",
      fontFamily: "var(--font-body, monospace)",
      fontSize: "11px",
      color: checked ? colors.text.primary : colors.text.tertiary,
      userSelect: "none",
    }}>
      <input
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        style={{ accentColor: colors.status.synced, cursor: "pointer" }}
      />
      {label ?? "Post comment"}
    </label>
  )
}
