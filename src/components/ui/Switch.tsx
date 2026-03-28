import React from "react"

interface SwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: string
  disabled?: boolean
}

export function Switch({ checked, onChange, label, disabled }: SwitchProps) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.45 : 1 }}>
      <div
        onClick={() => !disabled && onChange(!checked)}
        style={{
          width: "32px", height: "18px",
          borderRadius: "9px",
          border: `1px solid ${checked ? "var(--do-border-active)" : "var(--do-border)"}`,
          background: checked ? "var(--do-border-active)" : "var(--do-bg-elevated)",
          position: "relative",
          transition: "background 0.2s, border-color 0.2s",
          flexShrink: 0,
        }}
      >
        <div style={{
          position: "absolute",
          top: "2px",
          left: checked ? "14px" : "2px",
          width: "12px", height: "12px",
          borderRadius: "50%",
          background: checked ? "var(--do-bg-base)" : "var(--do-text-tertiary)",
          transition: "left 0.2s",
        }} />
      </div>
      {label && <span style={{ fontFamily: "var(--font-body, monospace)", fontSize: "12px", color: "var(--do-text-secondary)" }}>{label}</span>}
    </label>
  )
}
