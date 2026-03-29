import React, { useEffect, useState } from "react"
import { colors, space, textGlow } from "@/styles/tokens"
import { Panel, Button, Input, useToast } from "@/components/ui"
import { useConfigStore } from "@/store/configStore"
import RepoList from "@/components/config/RepoList"
import EngineSelector from "@/components/config/EngineSelector"
import SchedulePicker from "@/components/config/SchedulePicker"
import { checkGhAuth } from "@/ipc/github"
import type { AppConfig } from "@/types/config"
import { THEME_META, loadCustomThemes, saveCustomTheme, deleteCustomTheme, getBuiltInVars, applyTheme } from "@/styles/themes"
import type { ThemeId, BuiltInThemeId, CustomThemeMeta } from "@/styles/themes"

export default function Configuration() {
  const { config, loading, loadConfig, saveConfig } = useConfigStore()
  const [draft, setDraft] = useState<AppConfig>(config)
  const [ghStatus, setGhStatus] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const { addToast } = useToast()

  // Custom themes state
  const [customThemes, setCustomThemes] = useState<CustomThemeMeta[]>(() => loadCustomThemes())
  const [showCustomForm, setShowCustomForm] = useState(false)
  const [editingCustomId, setEditingCustomId] = useState<string | null>(null)
  const [customFormName, setCustomFormName] = useState("")
  const [customFormBase, setCustomFormBase] = useState<BuiltInThemeId>("shadcn-light")
  const [customFormVars, setCustomFormVars] = useState<Record<string, string>>({})

  const CUSTOM_VAR_FIELDS: Array<{ key: string; label: string }> = [
    { key: "--do-bg-base", label: "Background base" },
    { key: "--do-bg-surface", label: "Background surface" },
    { key: "--do-bg-elevated", label: "Background elevated" },
    { key: "--do-text-primary", label: "Text primary" },
    { key: "--do-text-secondary", label: "Text secondary" },
    { key: "--do-accent", label: "Accent" },
    { key: "--do-danger", label: "Danger" },
    { key: "--do-success", label: "Success" },
    { key: "--do-border", label: "Border" },
  ]

  const openNewCustomForm = () => {
    const baseVars = getBuiltInVars("shadcn-light")
    const initial: Record<string, string> = {}
    for (const { key } of CUSTOM_VAR_FIELDS) initial[key] = (baseVars as unknown as Record<string, string>)[key] ?? ""
    setCustomFormName("")
    setCustomFormBase("shadcn-light")
    setCustomFormVars(initial)
    setEditingCustomId(null)
    setShowCustomForm(true)
  }

  const openEditCustomForm = (theme: CustomThemeMeta) => {
    const initial: Record<string, string> = {}
    for (const { key } of CUSTOM_VAR_FIELDS) initial[key] = (theme.vars as unknown as Record<string, string>)[key] ?? ""
    setCustomFormName(theme.label)
    setCustomFormBase("shadcn-light")
    setCustomFormVars(initial)
    setEditingCustomId(theme.id)
    setShowCustomForm(true)
  }

  const handleCustomFormBaseChange = (base: BuiltInThemeId) => {
    setCustomFormBase(base)
    const baseVars = getBuiltInVars(base)
    const updated: Record<string, string> = {}
    for (const { key } of CUSTOM_VAR_FIELDS) updated[key] = (baseVars as unknown as Record<string, string>)[key] ?? ""
    setCustomFormVars(updated)
  }

  const handleSaveCustomTheme = () => {
    if (!customFormName.trim()) { addToast({ variant: "error", message: "Theme name is required." }); return }
    const id = editingCustomId ?? Math.random().toString(36).slice(2)
    const baseVars = getBuiltInVars(customFormBase)
    const mergedVars = { ...baseVars, ...customFormVars }
    const theme: CustomThemeMeta = {
      id,
      label: customFormName.trim(),
      description: "Custom theme",
      preview: {
        bg: customFormVars["--do-bg-base"] ?? "",
        surface: customFormVars["--do-bg-surface"] ?? "",
        text: customFormVars["--do-text-primary"] ?? "",
        accent: customFormVars["--do-accent"] ?? "",
      },
      vars: mergedVars,
    }
    saveCustomTheme(theme)
    const updated = loadCustomThemes()
    setCustomThemes(updated)
    applyTheme(id)
    setDraft(d => ({ ...d, theme: id }))
    setShowCustomForm(false)
    setEditingCustomId(null)
    addToast({ variant: "success", message: `Theme "${theme.label}" saved.` })
  }

  const handleDeleteCustomTheme = (id: string) => {
    deleteCustomTheme(id)
    setCustomThemes(loadCustomThemes())
    if ((draft.theme ?? "shadcn-light") === id) {
      setDraft(d => ({ ...d, theme: "shadcn-light" }))
      applyTheme("shadcn-light")
    }
  }

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

        {/* Built-in themes */}
        <div style={{ display: "flex", gap: space["3"], flexWrap: "wrap", marginBottom: space["4"] }}>
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

        {/* Custom themes */}
        <div style={{ borderTop: `1px solid ${colors.border.default}`, paddingTop: space["3"] }}>
          <div style={{ ...sectionHeaderStyle, borderBottom: "none", paddingBottom: 0, marginBottom: space["2"] }}>Custom Themes</div>
          {customThemes.length > 0 && (
            <div style={{ display: "flex", gap: space["3"], flexWrap: "wrap", marginBottom: space["3"] }}>
              {customThemes.map(t => {
                const active = (draft.theme ?? "shadcn-light") === t.id
                return (
                  <div
                    key={t.id}
                    style={{
                      border: `1px solid ${active ? colors.border.active : colors.border.default}`,
                      borderRadius: "8px",
                      padding: space["3"],
                      width: "160px",
                      background: active ? `${colors.border.active}11` : "transparent",
                      position: "relative" as const,
                    }}
                  >
                    <div
                      onClick={() => setDraft({ ...draft, theme: t.id as ThemeId })}
                      style={{ cursor: "pointer" }}
                    >
                      <div style={{ display: "flex", gap: "4px", marginBottom: space["2"] }}>
                        {[t.preview.bg, t.preview.surface, t.preview.text, t.preview.accent].map((c, i) => (
                          <div key={i} style={{ width: "16px", height: "16px", borderRadius: "3px", background: c, border: "1px solid rgba(128,128,128,0.2)" }} />
                        ))}
                      </div>
                      <div style={{ fontFamily: "var(--font-body, system-ui, sans-serif)", fontSize: "13px", fontWeight: active ? "600" : "400", color: active ? colors.text.primary : colors.text.secondary, marginBottom: "2px" }}>
                        {t.label}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: space["1"], marginTop: space["2"] }}>
                      <Button variant="ghost" size="sm" onClick={() => openEditCustomForm(t)}>Edit</Button>
                      <Button variant="danger" size="sm" onClick={() => handleDeleteCustomTheme(t.id)}>Delete</Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          <Button variant="ghost" size="sm" onClick={openNewCustomForm}>+ New theme</Button>

          {/* Inline custom theme form */}
          {showCustomForm && (
            <div style={{
              marginTop: space["3"],
              padding: space["4"],
              border: `1px solid ${colors.border.default}`,
              borderRadius: "8px",
              background: colors.bg.surface,
            }}>
              <div style={{ fontFamily: "var(--font-body, system-ui, sans-serif)", fontSize: "12px", fontWeight: "600", color: colors.text.secondary, marginBottom: space["3"] }}>
                {editingCustomId ? "Edit Custom Theme" : "New Custom Theme"}
              </div>

              {/* Name */}
              <div style={{ marginBottom: space["3"] }}>
                <span style={labelStyle}>Theme name</span>
                <Input
                  value={customFormName}
                  onChange={e => setCustomFormName(e.target.value)}
                  placeholder="My Custom Theme"
                />
              </div>

              {/* Base theme */}
              <div style={{ marginBottom: space["3"] }}>
                <span style={labelStyle}>Base theme</span>
                <select
                  value={customFormBase}
                  onChange={e => handleCustomFormBaseChange(e.target.value as BuiltInThemeId)}
                  style={{
                    fontFamily: "var(--font-body, system-ui, sans-serif)",
                    fontSize: "13px",
                    backgroundColor: colors.bg.input,
                    color: colors.text.primary,
                    border: `1px solid ${colors.border.default}`,
                    borderRadius: "4px",
                    padding: `${space["1"]} ${space["2"]}`,
                    display: "block",
                    width: "100%",
                  }}
                >
                  <option value="shadcn-light">Shadcn Light</option>
                  <option value="shadcn-dark">Shadcn Dark</option>
                  <option value="matrix">Matrix</option>
                </select>
              </div>

              {/* CSS var overrides */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: space["2"], marginBottom: space["3"] }}>
                {CUSTOM_VAR_FIELDS.map(({ key, label }) => (
                  <div key={key}>
                    <span style={{ ...labelStyle, fontSize: "11px" }}>{label}</span>
                    <Input
                      value={customFormVars[key] ?? ""}
                      onChange={e => setCustomFormVars(v => ({ ...v, [key]: e.target.value }))}
                      placeholder={key}
                    />
                  </div>
                ))}
              </div>

              <div style={{ display: "flex", gap: space["2"] }}>
                <Button variant="primary" size="sm" onClick={handleSaveCustomTheme}>Save theme</Button>
                <Button variant="ghost" size="sm" onClick={() => { setShowCustomForm(false); setEditingCustomId(null) }}>Cancel</Button>
              </div>
            </div>
          )}
        </div>
      </Panel>

      <Button variant="primary" onClick={handleSave} loading={saving}>
        Save configuration
      </Button>
    </div>
  )
}
