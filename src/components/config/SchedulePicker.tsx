import React from "react"
import { colors, space } from "@matrixui/tokens"
import { Switch } from "@matrixui/react"
import type { ScheduleConfig } from "@/types/config"

interface SchedulePickerProps {
  schedule: ScheduleConfig
  onChange: (s: ScheduleConfig) => void
}

export default function SchedulePicker({ schedule, onChange }: SchedulePickerProps) {
  const labelStyle: React.CSSProperties = {
    fontFamily: "var(--font-body, monospace)",
    fontSize: "11px",
    color: colors.text.tertiary,
    letterSpacing: "0.08em",
  }

  const numStyle: React.CSSProperties = {
    fontFamily: "var(--font-code, 'JetBrains Mono', monospace)",
    fontSize: "14px",
    color: colors.text.primary,
    backgroundColor: colors.bg.surface,
    border: `1px solid ${colors.border.default}`,
    padding: `${space['1']} ${space['2']}`,
    width: "56px",
    textAlign: "center",
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: space['3'] }}>
      <Switch checked={schedule.enabled} onChange={v => onChange({ ...schedule, enabled: v })} label="Enable scheduled runs" />
      {schedule.enabled && (
        <>
          <div style={{ display: "flex", gap: space['4'], alignItems: "center" }}>
            <div>
              <div style={labelStyle}>Hour (0–23)</div>
              <input type="number" min={0} max={23} value={schedule.hour} onChange={e => onChange({ ...schedule, hour: Number(e.target.value) })} style={numStyle} />
            </div>
            <div style={{ color: colors.text.tertiary, fontFamily: "monospace", marginTop: "16px" }}>:</div>
            <div>
              <div style={labelStyle}>Minute (0–59)</div>
              <input type="number" min={0} max={59} value={schedule.minute} onChange={e => onChange({ ...schedule, minute: Number(e.target.value) })} style={numStyle} />
            </div>
          </div>
          <Switch checked={schedule.catchUpOnWake} onChange={v => onChange({ ...schedule, catchUpOnWake: v })} label="Catch up on wake (run missed reviews after sleep)" />
        </>
      )}
    </div>
  )
}
