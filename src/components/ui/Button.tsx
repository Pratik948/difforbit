import React from "react"

type Variant = "primary" | "ghost" | "danger" | "cyan"
type Size = "sm" | "md" | "lg"

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
}

const variantStyle: Record<Variant, React.CSSProperties> = {
  primary: { border: "1px solid var(--do-border-active)", color: "var(--do-text-primary)", background: "transparent" },
  ghost:   { border: "1px solid var(--do-border)",        color: "var(--do-text-secondary)", background: "transparent" },
  danger:  { border: "1px solid var(--do-danger)",        color: "var(--do-danger)", background: "transparent" },
  cyan:    { border: "1px solid var(--do-accent-cyan)",   color: "var(--do-accent-cyan)", background: "transparent" },
}

const sizeStyle: Record<Size, React.CSSProperties> = {
  sm: { padding: "3px 10px", fontSize: "11px" },
  md: { padding: "6px 14px", fontSize: "12px" },
  lg: { padding: "8px 18px", fontSize: "13px" },
}

export function Button({ variant = "ghost", size = "md", loading, disabled, children, style, ...rest }: ButtonProps) {
  const isDisabled = disabled || loading
  return (
    <button
      disabled={isDisabled}
      style={{
        fontFamily: "var(--font-body, monospace)",
        cursor: isDisabled ? "not-allowed" : "pointer",
        opacity: isDisabled ? 0.45 : 1,
        borderRadius: "3px",
        transition: "opacity 0.15s, border-color 0.15s",
        outline: "none",
        userSelect: "none",
        ...variantStyle[variant],
        ...sizeStyle[size],
        ...style,
      }}
      {...rest}
    >
      {loading ? "…" : children}
    </button>
  )
}
