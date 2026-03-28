import React, { useEffect, useState } from "react"
import { colors, space } from "@/styles/tokens"
import { Button, Input } from "@/components/ui"
import type { EngineConfig, EngineType } from "@/types/engine"
import { hasApiKey, saveApiKey, deleteApiKey } from "@/ipc/engines"

interface EngineSelectorProps {
  engine: EngineConfig
  onChange: (engine: EngineConfig) => void
}

const ENGINE_OPTIONS: { value: EngineType; label: string }[] = [
  { value: "anthropic", label: "Anthropic API" },
  { value: "openai_compatible", label: "OpenAI-compatible" },
  { value: "claude_code", label: "Claude Code CLI" },
]

export default function EngineSelector({ engine, onChange }: EngineSelectorProps) {
  const [apiKeyStatus, setApiKeyStatus] = useState<"unknown" | "set" | "unset">("unknown")
  const [apiKeyInput, setApiKeyInput] = useState("")
  const [saving, setSaving] = useState(false)

  const service = engine.type === "anthropic" ? "difforbit.anthropic" : "difforbit.openai"

  useEffect(() => {
    if (engine.type === "claude_code") return
    hasApiKey(service).then(has => setApiKeyStatus(has ? "set" : "unset")).catch(() => setApiKeyStatus("unset"))
  }, [engine.type, service])

  const labelStyle: React.CSSProperties = {
    fontFamily: "var(--font-body, monospace)",
    fontSize: "11px",
    color: colors.text.tertiary,
    letterSpacing: "0.08em",
    marginBottom: space['1'],
    display: "block",
  }

  const rowStyle: React.CSSProperties = {
    display: "flex",
    gap: space['3'],
    alignItems: "center",
    marginBottom: space['3'],
    flexWrap: "wrap",
  }

  const handleSaveKey = async () => {
    if (!apiKeyInput) return
    setSaving(true)
    try {
      await saveApiKey(service, apiKeyInput)
      setApiKeyStatus("set")
      setApiKeyInput("")
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteKey = async () => {
    await deleteApiKey(service)
    setApiKeyStatus("unset")
  }

  return (
    <div>
      <div style={rowStyle}>
        {ENGINE_OPTIONS.map(opt => (
          <label key={opt.value} style={{ display: "flex", alignItems: "center", gap: space['1'], fontFamily: "var(--font-body, monospace)", fontSize: "12px", color: engine.type === opt.value ? colors.text.primary : colors.text.secondary, cursor: "pointer" }}>
            <input
              type="radio"
              checked={engine.type === opt.value}
              onChange={() => onChange({ ...engine, type: opt.value })}
              style={{ accentColor: colors.status.synced }}
            />
            {opt.label}
          </label>
        ))}
      </div>

      {engine.type === "claude_code" ? (
        <div style={{ fontFamily: "var(--font-body, monospace)", fontSize: "11px", color: colors.text.tertiary, padding: space['2'], border: `1px solid ${colors.border.default}` }}>
          Uses authenticated Claude Code CLI session. Ensure `claude` is in $PATH.
        </div>
      ) : (
        <>
          {engine.type === "openai_compatible" && (
            <div style={{ marginBottom: space['3'] }}>
              <span style={labelStyle}>Base URL</span>
              <Input variant="cyan" value={engine.baseUrl ?? ""} onChange={e => onChange({ ...engine, baseUrl: e.target.value })} placeholder="https://api.openai.com/v1" />
            </div>
          )}
          <div style={{ marginBottom: space['3'] }}>
            <span style={labelStyle}>Model</span>
            <Input variant="green" value={engine.model} onChange={e => onChange({ ...engine, model: e.target.value })} placeholder="claude-opus-4-5-20251001" />
          </div>
          <div style={{ marginBottom: space['3'] }}>
            <span style={labelStyle}>API Key — {apiKeyStatus === "set" ? <span style={{ color: colors.status.synced }}>● SET</span> : <span style={{ color: colors.status.behind }}>○ NOT SET</span>}</span>
            <div style={{ display: "flex", gap: space['2'], alignItems: "center" }}>
              <Input variant="green" value={apiKeyInput} onChange={e => setApiKeyInput(e.target.value)} placeholder="sk-..." style={{ flex: 1 }} />
              <Button variant="primary" size="sm" onClick={handleSaveKey} loading={saving}>Save</Button>
              {apiKeyStatus === "set" && <Button variant="danger" size="sm" onClick={handleDeleteKey}>Delete</Button>}
            </div>
          </div>
        </>
      )}

      <div style={{ display: "flex", gap: space['4'], marginTop: space['3'] }}>
        <div>
          <span style={labelStyle}>Max Tokens: {engine.maxTokens}</span>
          <input type="range" min={512} max={8192} step={512} value={engine.maxTokens} onChange={e => onChange({ ...engine, maxTokens: Number(e.target.value) })} style={{ accentColor: colors.status.synced, width: "160px" }} />
        </div>
        <div>
          <span style={labelStyle}>Temperature: {engine.temperature.toFixed(1)}</span>
          <input type="range" min={0} max={1} step={0.1} value={engine.temperature} onChange={e => onChange({ ...engine, temperature: Number(e.target.value) })} style={{ accentColor: colors.status.synced, width: "120px" }} />
        </div>
      </div>
    </div>
  )
}
