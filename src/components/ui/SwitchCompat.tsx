// Wraps shadcn Switch to support our old onChange + label props.
import { Switch as ShadSwitch } from "./switch"

interface SwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: string
  disabled?: boolean
}

export function Switch({ checked, onChange, label, disabled }: SwitchProps) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1 }}>
      <ShadSwitch checked={checked} onCheckedChange={onChange} disabled={disabled} />
      {label && <span style={{ fontSize: "12px", color: "var(--do-text-secondary)", fontFamily: "var(--font-body, sans-serif)" }}>{label}</span>}
    </label>
  )
}
