import React, { useEffect, useState } from "react"
import { colors, space, textGlow } from "@/styles/tokens"
import { Panel, Button, useToast } from "@/components/ui"
import { useConfigStore } from "@/store/configStore"
import ProfileEditor from "@/components/config/ProfileEditor"
import type { ReviewProfile } from "@/types/config"
import { invoke } from "@tauri-apps/api/core"

function newCustomProfile(): ReviewProfile {
  return {
    id: `custom-${Date.now()}`,
    name: "New Profile",
    languages: [],
    extensions: [],
    systemPrompt: "You are a senior software engineer. Review the diff and return raw JSON only.",
    isBuiltIn: false,
  }
}

export default function Profiles() {
  const { config, loadConfig, saveConfig } = useConfigStore()
  const [selected, setSelected] = useState<string | null>(null)
  const { addToast } = useToast()

  useEffect(() => {
    loadConfig().then(() => {
      if (config.profiles.length > 0 && !selected) {
        setSelected(config.profiles[0].id)
      }
    })
  }, [])

  useEffect(() => {
    if (config.profiles.length > 0 && !selected) {
      setSelected(config.profiles[0].id)
    }
  }, [config.profiles])

  const selectedProfile = config.profiles.find(p => p.id === selected)

  const handleSave = async (updated: ReviewProfile) => {
    const profiles = config.profiles.map(p => p.id === updated.id ? updated : p)
    await saveConfig({ ...config, profiles })
    addToast({ variant: "success", message: `Saved "${updated.name}".` })
  }

  const handleNew = async () => {
    const p = newCustomProfile()
    const profiles = [...config.profiles, p]
    await saveConfig({ ...config, profiles })
    setSelected(p.id)
  }

  const handleDelete = async () => {
    if (!selected) return
    const profiles = config.profiles.filter(p => p.id !== selected)
    await saveConfig({ ...config, profiles })
    setSelected(profiles[0]?.id ?? null)
    addToast({ variant: "success", message: "Profile deleted." })
  }

  const handleReset = async () => {
    if (!selected) return
    try {
      const original: ReviewProfile = await invoke("reset_profile", { id: selected })
      const profiles = config.profiles.map(p => p.id === selected ? original : p)
      await saveConfig({ ...config, profiles })
      addToast({ variant: "success", message: "Profile reset to default." })
    } catch (e) {
      addToast({ variant: "error", message: String(e) })
    }
  }

  const handleExport = () => {
    if (!selectedProfile) return
    const json = JSON.stringify(selectedProfile, null, 2)
    const blob = new Blob([json], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `difforbit-profile-${selectedProfile.id}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = () => {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = ".json"
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return
      const text = await file.text()
      try {
        const imported = JSON.parse(text) as ReviewProfile
        const newProfile: ReviewProfile = {
          ...imported,
          id: `custom-${Date.now()}`,
          isBuiltIn: false,
        }
        const profiles = [...config.profiles, newProfile]
        await saveConfig({ ...config, profiles })
        setSelected(newProfile.id)
        addToast({ variant: "success", message: `Imported "${newProfile.name}".` })
      } catch (e) {
        addToast({ variant: "error", message: `Invalid profile JSON: ${e}` })
      }
    }
    input.click()
  }

  const headerStyle: React.CSSProperties = {
    fontFamily: "var(--font-display, 'Share Tech Mono', monospace)",
    fontSize: "20px",
    color: colors.text.primary,
    textShadow: textGlow.greenPrimary,
    marginBottom: space['6'],
    letterSpacing: "0.05em",
  }

  return (
    <div style={{ padding: space['6'], height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={headerStyle}>// PROFILES</div>
      <div style={{ display: "flex", gap: space['4'], flex: 1, overflow: "hidden" }}>
        {/* Profile list */}
        <Panel rain={{ preset: "sidebar" }} style={{ width: "200px", flexShrink: 0, padding: space['2'], display: "flex", flexDirection: "column", overflowY: "auto" }}>
          <div style={{ marginBottom: space['2'] }}>
            <Button variant="ghost" size="sm" onClick={handleNew} style={{ width: "100%" }}>+ New Profile</Button>
          </div>
          <div style={{ marginBottom: space['2'] }}>
            <Button variant="ghost" size="sm" onClick={handleImport} style={{ width: "100%" }}>Import JSON</Button>
          </div>
          {config.profiles.map(p => (
            <div
              key={p.id}
              onClick={() => setSelected(p.id)}
              style={{
                padding: `${space['2']} ${space['2']}`,
                cursor: "pointer",
                fontFamily: "var(--font-body, monospace)",
                fontSize: "11px",
                color: p.id === selected ? colors.text.primary : colors.text.secondary,
                backgroundColor: p.id === selected ? colors.bg.elevated : "transparent",
                borderLeft: p.id === selected ? `2px solid ${colors.border.active}` : "2px solid transparent",
                borderRadius: "2px",
                marginBottom: space['1'],
              }}
            >
              <span style={{ color: colors.text.ghost, fontSize: "9px", marginRight: space['1'] }}>{p.isBuiltIn ? "●" : "○"}</span>
              {p.name}
            </div>
          ))}
        </Panel>

        {/* Editor */}
        <Panel rain={{ preset: "diff" }} style={{ flex: 1, padding: space['4'], overflowY: "auto" }}>
          {selectedProfile ? (
            <>
              <ProfileEditor
                profile={selectedProfile}
                onSave={handleSave}
                {...(!selectedProfile.isBuiltIn ? { onDelete: handleDelete } : {})}
                {...(selectedProfile.isBuiltIn ? { onReset: handleReset } : {})}
              />
              <div style={{ marginTop: space['4'], borderTop: `1px solid ${colors.border.default}`, paddingTop: space['3'] }}>
                <Button variant="ghost" size="sm" onClick={handleExport}>Export JSON</Button>
              </div>
            </>
          ) : (
            <div style={{ fontFamily: "var(--font-body, monospace)", fontSize: "12px", color: colors.text.tertiary }}>
              Select a profile from the list.
            </div>
          )}
        </Panel>
      </div>
    </div>
  )
}
