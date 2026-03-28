import { useConfigStore } from "@/store/configStore"
import MatrixRain from "@/components/rain/MatrixRain"

interface PanelProps {
  rain?: { preset?: string; style?: React.CSSProperties }
  bgOpacity?: number
  style?: React.CSSProperties
  className?: string
  children: React.ReactNode
}

export function Panel({ rain, style, className, children }: PanelProps) {
  const theme = useConfigStore(s => s.config.theme)
  const isMatrix = (theme ?? "shadcn-light") === "matrix"

  return (
    <div
      style={{
        position: "relative",
        overflow: "hidden",
        backgroundColor: "var(--do-bg-surface)",
        border: "1px solid var(--do-border)",
        borderRadius: "4px",
        ...style,
      }}
      className={className}
    >
      {isMatrix && rain && (
        <MatrixRain preset={(rain.preset as "sidebar" | "diff" | "modal") ?? "diff"} style={{ zIndex: 0, ...rain.style }} />
      )}
      <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", flexDirection: "column" }}>
        {children}
      </div>
    </div>
  )
}
