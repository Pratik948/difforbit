import React, { useEffect, useState } from "react"
import { colors, space, textGlow } from "@matrixui/tokens"
import { Panel, Button, Input, useToast } from "@matrixui/react"
import { useConfigStore } from "@/store/configStore"
import RepoList from "@/components/config/RepoList"
import EngineSelector from "@/components/config/EngineSelector"
import SchedulePicker from "@/components/config/SchedulePicker"
import { checkGhAuth } from "@/ipc/github"
import type { AppConfig } from "@/types/config"

export default function Configuration() {
  const { config, loading, loadConfig, saveConfig } = useConfigStore()
  const [draft, setDraft] = useState<AppConfig>(config)
  const [ghStatus, setGhStatus] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const { addToast } = useToast()

  useEffect(() => {
    loadConfig()
  }, [loadConfig])

  useEffect(() => {
    setDraft(config)
  }, [config])

  const checkAuth = async () => {
    try {
      const user = await checkGhAuth()
      setGhStatus(user)
    } catch {
      setGhStatus("NOT AUTHENTICATED")
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await saveConfig(draft)
      addToast({ variant: "success", message: "Configuration saved." })
    } catch (e) {
      addToast({ variant: "error", message: String(e) })
    } finally {
      setSaving(false)
    }
  }

  const headerStyle: React.CSSProperties = {
    fontFamily: "var(--font-display, 'Share Tech Mono', monospace)",
    fontSize: "20px",
    color: colors.text.primary,
    textShadow: textGlow.greenPrimary,
    marginBottom: space['6'],
    letterSpacing: "0.05em",
  }

  const sectionHeaderStyle: React.CSSProperties = {
    fontFamily: "var(--font-display, 'Share Tech Mono', monospace)",
    fontSize: "13px",
    color: colors.text.primary,
    letterSpacing: "0.1em",
    marginBottom: space['3'],
    borderBottom: `1px solid ${colors.border.default}`,
    paddingBottom: space['2'],
  }

  const labelStyle: React.CSSProperties = {
    fontFamily: "var(--font-body, monospace)",
    fontSize: "11px",
    color: colors.text.tertiary,
    letterSpacing: "0.08em",
    marginBottom: space['1'],
    display: "block",
  }

  const panelStyle: React.CSSProperties = {
    padding: space['4'],
    marginBottom: space['4'],
  }

  if (loading) {
    return <div style={{ padding: space['6'], color: colors.text.tertiary, fontFamily: "monospace" }}>Loading config…</div>
  }

  return (
    <div style={{ padding: space['6'], overflowY: "auto", height: "100%" }}>
      <div style={headerStyle}>// CONFIGURATION</div>

      {/* GitHub section */}
      <Panel rain={{ preset: "diff" }} style={panelStyle}>
        <div style={sectionHeaderStyle}>GITHUB</div>
        <span style={labelStyle}>GitHub Username</span>
        <div style={{ display: "flex", gap: space['3'], alignItems: "center", marginBottom: space['3'] }}>
          <Input
            variant="green"
            value={draft.githubUsername}
            onChange={e => setDraft({ ...draft, githubUsername: e.target.value })}
            placeholder="octocat"
          />
          <Button variant="ghost" size="sm" onClick={checkAuth}>Check Auth</Button>
        </div>
        {ghStatus && (
          <div style={{ fontFamily: "var(--font-body, monospace)", fontSize: "11px", color: ghStatus.startsWith("NOT") ? colors.status.behind : colors.status.synced }}>
            gh auth: {ghStatus}
          </div>
        )}
      </Panel>

      {/* Repositories section */}
      <Panel rain={{ preset: "diff" }} style={panelStyle}>
        <div style={sectionHeaderStyle}>REPOSITORIES</div>
        <RepoList
          repos={draft.repos}
          profiles={draft.profiles.length ? draft.profiles : [{ id: "builtin-generic", name: "Generic", languages: [], extensions: [], systemPrompt: "", isBuiltIn: true }]}
          onChange={repos => setDraft({ ...draft, repos })}
        />
      </Panel>

      {/* AI Engine section */}
      <Panel rain={{ preset: "diff" }} style={panelStyle}>
        <div style={sectionHeaderStyle}>AI ENGINE</div>
        <EngineSelector engine={draft.engine} onChange={engine => setDraft({ ...draft, engine })} />
      </Panel>

      {/* Schedule section */}
      <Panel rain={{ preset: "diff" }} style={panelStyle}>
        <div style={sectionHeaderStyle}>SCHEDULE</div>
        <SchedulePicker schedule={draft.schedule} onChange={schedule => setDraft({ ...draft, schedule })} />
      </Panel>

      {/* Save */}
      <Button variant="primary" onClick={handleSave} loading={saving}>
        SAVE CONFIGURATION
      </Button>
    </div>
  )
}
