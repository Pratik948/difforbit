// Compatibility wrapper — Panel now renders a shadcn Card.
// The `rain` and `bgOpacity` props are accepted but ignored (rain removed).
import { Card } from "./card"

interface PanelProps {
  children: React.ReactNode
  style?: React.CSSProperties
  className?: string
  rain?: { preset?: string; style?: React.CSSProperties }
  bgOpacity?: number
}

export function Panel({ children, style, className }: PanelProps) {
  return (
    <Card style={{ backgroundColor: "var(--do-bg-surface)", border: "1px solid var(--do-border)", borderRadius: "6px", ...style }} className={className}>
      {children}
    </Card>
  )
}
