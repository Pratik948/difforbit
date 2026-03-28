import React, { useState, useEffect } from "react"
import { colors, space, textGlow } from "@/styles/tokens"
import { Button, Input, Textarea } from "@/components/ui"
import type { ReviewProfile } from "@/types/config"

interface ProfileEditorProps {
  profile: ReviewProfile
  onSave: (updated: ReviewProfile) => void
  onDelete?: () => void
  onReset?: () => void
}

export default function ProfileEditor({ profile, onSave, onDelete, onReset }: ProfileEditorProps) {
  const [draft, setDraft] = useState(profile)

  useEffect(() => { setDraft(profile) }, [profile])

  const labelStyle: React.CSSProperties = {
    fontFamily: "var(--font-body, monospace)",
    fontSize: "11px",
    color: colors.text.tertiary,
    letterSpacing: "0.08em",
    marginBottom: space['1'],
    display: "block",
  }

  const fieldStyle: React.CSSProperties = {
    marginBottom: space['3'],
  }

  return (
    <div>
      <div style={{ fontFamily: "var(--font-display, monospace)", fontSize: "13px", color: colors.text.primary, textShadow: textGlow.greenPrimary, marginBottom: space['4'] }}>
        {draft.isBuiltIn ? "[ BUILT-IN ]" : "[ CUSTOM ]"} {draft.name}
      </div>

      <div style={fieldStyle}>
        <span style={labelStyle}>Name</span>
        <Input  value={draft.name} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))} placeholder="Profile name" {...(draft.isBuiltIn ? { disabled: true } as Record<string, boolean> : {})} />
      </div>

      <div style={fieldStyle}>
        <span style={labelStyle}>Languages (comma-separated)</span>
        <Input
          
          value={draft.languages.join(", ")}
          onChange={e => setDraft(d => ({ ...d, languages: e.target.value.split(",").map(s => s.trim()).filter(Boolean) }))}
          placeholder="typescript, javascript"
          {...(draft.isBuiltIn ? { disabled: true } as Record<string, boolean> : {})}
        />
      </div>

      <div style={fieldStyle}>
        <span style={labelStyle}>Extensions (comma-separated)</span>
        <Input
          
          value={draft.extensions.join(", ")}
          onChange={e => setDraft(d => ({ ...d, extensions: e.target.value.split(",").map(s => s.trim()).filter(Boolean) }))}
          placeholder=".ts, .tsx"
          {...(draft.isBuiltIn ? { disabled: true } as Record<string, boolean> : {})}
        />
      </div>

      <div style={fieldStyle}>
        <span style={labelStyle}>System Prompt</span>
        <Textarea
          
          rows={10}
          value={draft.systemPrompt}
          onChange={e => setDraft(d => ({ ...d, systemPrompt: e.target.value }))}
          placeholder="Reviewer persona and rules..."
        />
      </div>

      <div style={{ display: "flex", gap: space['2'], flexWrap: "wrap" }}>
        <Button variant="primary" size="sm" onClick={() => onSave(draft)}>Save</Button>
        {draft.isBuiltIn && onReset && (
          <Button variant="ghost" size="sm" onClick={onReset}>Reset to Default</Button>
        )}
        {!draft.isBuiltIn && onDelete && (
          <Button variant="danger" size="sm" onClick={onDelete}>Delete</Button>
        )}
      </div>
    </div>
  )
}
