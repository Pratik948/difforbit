import React from "react"

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  variant?: "green" | "cyan" | "default"
}

export function Input({ variant = "default", style, ...rest }: InputProps) {
  return (
    <input
      style={{
        fontFamily: "var(--font-body, monospace)",
        fontSize: "12px",
        padding: "6px 10px",
        backgroundColor: "var(--do-bg-input)",
        color: "var(--do-text-primary)",
        border: "1px solid var(--do-border)",
        borderRadius: "3px",
        outline: "none",
        width: "100%",
        boxSizing: "border-box",
        ...style,
      }}
      {...rest}
    />
  )
}
