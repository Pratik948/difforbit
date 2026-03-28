import { colors, space } from "@/styles/tokens"

export type VerdictFilter = "ALL" | "APPROVE" | "REQUEST_CHANGES" | "NEEDS_DISCUSSION"
export type DateFilter = "ALL" | "TODAY" | "WEEK"

interface Props {
  verdict: VerdictFilter
  date: DateFilter
  onVerdictChange: (v: VerdictFilter) => void
  onDateChange: (d: DateFilter) => void
}

const VERDICTS: { value: VerdictFilter; label: string; color: string }[] = [
  { value: "ALL", label: "All", color: colors.text.secondary },
  { value: "APPROVE", label: "Approved", color: colors.status.synced },
  { value: "REQUEST_CHANGES", label: "Changes Requested", color: colors.status.behind },
  { value: "NEEDS_DISCUSSION", label: "Needs Discussion", color: colors.status.modified },
]

const DATES: { value: DateFilter; label: string }[] = [
  { value: "ALL", label: "All time" },
  { value: "WEEK", label: "This week" },
  { value: "TODAY", label: "Today" },
]

function Pill({
  label, active, color, onClick,
}: { label: string; active: boolean; color: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: active ? `${color}22` : "transparent",
        border: `1px solid ${active ? color : colors.border.default}`,
        borderRadius: "4px",
        color: active ? color : colors.text.tertiary,
        cursor: "pointer",
        fontFamily: "var(--font-body)",
        fontSize: "0.78rem",
        padding: `${space['1']} ${space['3']}`,
        transition: "all 0.15s",
        whiteSpace: "nowrap" as const,
      }}
    >
      {label}
    </button>
  )
}

export function FilterBar({ verdict, date, onVerdictChange, onDateChange }: Props) {
  return (
    <div style={{ display: "flex", gap: space['2'], flexWrap: "wrap" as const, alignItems: "center" }}>
      <span style={{ color: colors.text.tertiary, fontFamily: "var(--font-body)", fontSize: "0.75rem", marginRight: space['1'] }}>
        VERDICT
      </span>
      {VERDICTS.map(v => (
        <Pill
          key={v.value}
          label={v.label}
          active={verdict === v.value}
          color={v.color}
          onClick={() => onVerdictChange(v.value)}
        />
      ))}

      <span style={{
        width: "1px", height: "1rem",
        background: colors.border.default,
        margin: `0 ${space['1']}`,
      }} />

      <span style={{ color: colors.text.tertiary, fontFamily: "var(--font-body)", fontSize: "0.75rem", marginRight: space['1'] }}>
        DATE
      </span>
      {DATES.map(d => (
        <Pill
          key={d.value}
          label={d.label}
          active={date === d.value}
          color={colors.status.ahead}
          onClick={() => onDateChange(d.value)}
        />
      ))}
    </div>
  )
}
