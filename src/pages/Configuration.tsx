import React, { useEffect, useState } from "react"
import { colors, space, textGlow } from "@/styles/tokens"
import { Panel, Button, Input, useToast } from "@/components/ui"
import { useConfigStore } from "@/store/configStore"
import RepoList from "@/components/config/RepoList"
import EngineSelector from "@/components/config/EngineSelector"
import SchedulePicker from "@/components/config/SchedulePicker"
import { checkGhAuth } from "@/ipc/github"
import type { AppConfig } from "@/types/config"
import { THEME_META } from "@/styles/themes"
import type { ThemeId } from "@/styles/themes"

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
      setGhStatus("Not authenticated")
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
    fontFamily: "var(--font-display, 'Inter', system-ui, sans-serif)",
    fontSize: "22px",
    fontWeight: "600",
    color: colors.text.primary,
    textShadow: textGlow.greenPrimary,
    marginBottom: space["6"],
    letterSpacing: "-0.01em",
  }

  const sectionHeaderStyle: React.CSSProperties = {
    fontFamily: "var(--font-body, system-ui, sans-serif)",
    fontSize: "12px",
    fontWeight: "600",
    color: colors.text.tertiary,
    letterSpacing: "0.04em",
    textTransform: "uppercase" as const,
    marginBottom: space["3"],
    borderBottom: `1px solid ${colors.border.default}`,
    paddingBottom: space["2"],
  }

  const labelStyle: React.CSSProperties = {
    fontFamily: "var(--font-body, system-ui, sans-serif)",
    fontSize: "13px",
    color: colors.text.secondary,
    marginBottom: space["1"],
    display: "block",
  }

  const panelStyle: React.CSSProperties = {
    padding: space["4"],
    marginBottom: space["4"],
  }

  if (loading) {
    return <div style={{ padding: space["6"], color: colors.text.tertiary, fontFamily: "var(--font-body, system-ui, sans-serif)" }}>Loading…</div>
  }

  return (
    <div style={{ padding: space["6"], overflowY: "auto", height: "100%" }}>
      <h1 style={headerStyle}>Configuration</h1>

      {/* GitHub section */}
      <Panel style={panelStyle}>
        <div style={sectionHeaderStyle}>GitHub</div>
        <span style={labelStyle}>GitHub username</span>
        <div style={{ display: "flex", gap: space["3"], alignItems: "center", marginBottom: space["3"] }}>
          <Input
            value={draft.githubUsername}
            onChange={e => setDraft({ ...draft, githubUsername: e.target.value })}
            placeholder="octocat"
          />
          <Button variant="ghost" size="sm" onClick={checkAuth}>Check auth</Button>
        </div>
        {ghStatus && (
          <div style={{ fontFamily: "var(--font-body, system-ui, sans-serif)", fontSize: "13px", color: ghStatus.startsWith("Not") ? colors.status.behind : colors.status.synced }}>
            {ghStatus.startsWith("Not") ? ghStatus : `Authenticated as ${ghStatus}`}
          </div>
        )}
      </Panel>

      {/* Repositories section */}
      <Panel style={panelStyle}>
        <div style={sectionHeaderStyle}>Repositories</div>
        <RepoList
          repos={draft.repos}
          profiles={draft.profiles.length ? draft.profiles : [{ id: "builtin-generic", name: "Generic", languages: [], extensions: [], systemPrompt: "", isBuiltIn: true }]}
          onChange={repos => setDraft({ ...draft, repos })}
        />
      </Panel>

      {/* AI Engine section */}
      <Panel style={panelStyle}>
        <div style={sectionHeaderStyle}>AI Engine</div>
        <EngineSelector engine={draft.engine} onChange={engine => setDraft({ ...draft, engine })} />
      </Panel>

      {/* Schedule section */}
      <Panel style={panelStyle}>
        <div style={sectionHeaderStyle}>Schedule</div>
        <SchedulePicker schedule={draft.schedule} onChange={schedule => setDraft({ ...draft, schedule })} />
      </Panel>

      {/* Appearance section */}
      <Panel style={panelStyle}>
        <div style={sectionHeaderStyle}>Appearance</div>
        <div style={{ display: "flex", gap: space["3"], flexWrap: "wrap" }}>
          {THEME_META.map(t => {
            const active = (draft.theme ?? "shadcn-light") === t.id
            return (
              <div
                key={t.id}
                onClick={() => setDraft({ ...draft, theme: t.id as ThemeId })}
                style={{
                  cursor: "pointer",
                  border: `1px solid ${active ? colors.border.active : colors.border.default}`,
                  borderRadius: "8px",
                  padding: space["3"],
                  width: "160px",
                  background: active ? `${colors.border.active}11` : "transparent",
                  transition: "border-color 0.15s ease",
                }}
              >
                <div style={{ display: "flex", gap: "4px", marginBottom: space["2"] }}>
                  {[t.preview.bg, t.preview.surface, t.preview.text, t.preview.accent].map((c, i) => (
                    <div key={i} style={{ width: "16px", height: "16px", borderRadius: "3px", background: c, border: "1px solid rgba(128,128,128,0.2)" }} />
                  ))}
                </div>
                <div style={{ fontFamily: "var(--font-body, system-ui, sans-serif)", fontSize: "13px", fontWeight: active ? "600" : "400", color: active ? colors.text.primary : colors.text.secondary, marginBottom: "2px" }}>
                  {t.label}
                </div>
                <div style={{ fontFamily: "var(--font-body, system-ui, sans-serif)", fontSize: "11px", color: colors.text.tertiary }}>
                  {t.description}
                </div>
              </div>
            )
          })}
        </div>
      </Panel>

      <Button variant="primary" onClick={handleSave} loading={saving}>
        Save configuration
      </Button>
    </div>
  )
}
