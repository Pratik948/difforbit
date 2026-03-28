import React from "react"

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

export function Textarea({ style, ...rest }: TextareaProps) {
  return (
    <textarea
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
        resize: "vertical",
        ...style,
      }}
      {...rest}
    />
  )
}
