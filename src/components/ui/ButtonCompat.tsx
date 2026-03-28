// Maps our old variant names to shadcn's, adds loading prop support.
import { Button as ShadButton, buttonVariants } from "./button"
import type { VariantProps } from "class-variance-authority"
import type React from "react"

type ShadVariant = VariantProps<typeof buttonVariants>["variant"]
type OurVariant = "primary" | "ghost" | "danger" | "cyan"

const MAP: Record<OurVariant, ShadVariant> = {
  primary: "default",
  ghost:   "outline",
  danger:  "destructive",
  cyan:    "secondary",
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: OurVariant | ShadVariant
  size?: "sm" | "md" | "lg" | "default" | "icon"
  loading?: boolean
  asChild?: boolean
}

export function Button({ variant = "ghost", size, loading, disabled, children, ...rest }: ButtonProps) {
  const mapped = MAP[variant as OurVariant] ?? (variant as ShadVariant) ?? "outline"
  const shadSize = (size === "md" ? "default" : size) as VariantProps<typeof buttonVariants>["size"]
  return (
    <ShadButton variant={mapped} size={shadSize} disabled={disabled || loading} {...rest}>
      {loading ? "…" : children}
    </ShadButton>
  )
}
