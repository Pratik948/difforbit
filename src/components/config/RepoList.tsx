import React, { useState } from "react"
import { colors, space } from "@matrixui/tokens"
import { Button, Input, Switch } from "@matrixui/react"
import type { RepoConfig, ReviewProfile } from "@/types/config"

interface RepoListProps {
  repos: RepoConfig[]
  profiles: ReviewProfile[]
  onChange: (repos: RepoConfig[]) => void
}

export default function RepoList({ repos, profiles, onChange }: RepoListProps) {
  const [adding, setAdding] = useState(false)
  const [newOwner, setNewOwner] = useState("")
  const [newRepo, setNewRepo] = useState("")
  const [newProfile, setNewProfile] = useState(profiles[0]?.id ?? "")

  const labelStyle: React.CSSProperties = {
    fontFamily: "var(--font-body, monospace)",
    fontSize: "11px",
    color: colors.text.tertiary,
    letterSpacing: "0.08em",
  }

  const rowStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: space['3'],
    padding: `${space['2']} 0`,
    borderBottom: `1px solid ${colors.border.default}`,
    fontFamily: "var(--font-body, monospace)",
    fontSize: "12px",
    color: colors.text.secondary,
  }

  const addRepo = () => {
    if (!newOwner || !newRepo) return
    const entry: RepoConfig = {
      owner: newOwner.trim(),
      repo: newRepo.trim(),
      profileId: newProfile || profiles[0]?.id || "builtin-generic",
      enabled: true,
    }
    onChange([...repos, entry])
    setNewOwner("")
    setNewRepo("")
    setAdding(false)
  }

  const toggleRepo = (idx: number) => {
    const updated = repos.map((r, i) => i === idx ? { ...r, enabled: !r.enabled } : r)
    onChange(updated)
  }

  const removeRepo = (idx: number) => {
    onChange(repos.filter((_, i) => i !== idx))
  }

  const changeProfile = (idx: number, profileId: string) => {
    onChange(repos.map((r, i) => i === idx ? { ...r, profileId } : r))
  }

  return (
    <div>
      {repos.map((r, idx) => (
        <div key={idx} style={rowStyle}>
          <span style={{ flex: 1 }}>{r.owner}/{r.repo}</span>
          <select
            value={r.profileId}
            onChange={e => changeProfile(idx, e.target.value)}
            style={{ fontFamily: "var(--font-body, monospace)", fontSize: "11px", backgroundColor: colors.bg.surface, color: colors.text.secondary, border: `1px solid ${colors.border.default}`, padding: "2px 4px" }}
          >
            {profiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <Switch checked={r.enabled} onChange={() => toggleRepo(idx)} label="" />
          <Button variant="danger" size="sm" onClick={() => removeRepo(idx)}>×</Button>
        </div>
      ))}
      {adding ? (
        <div style={{ display: "flex", gap: space['2'], marginTop: space['3'], flexWrap: "wrap" }}>
          <Input variant="green" value={newOwner} onChange={e => setNewOwner(e.target.value)} placeholder="owner" style={{ width: "120px" }} />
          <Input variant="green" value={newRepo} onChange={e => setNewRepo(e.target.value)} placeholder="repo" style={{ width: "140px" }} />
          <select
            value={newProfile}
            onChange={e => setNewProfile(e.target.value)}
            style={{ fontFamily: "var(--font-body, monospace)", fontSize: "11px", backgroundColor: colors.bg.surface, color: colors.text.secondary, border: `1px solid ${colors.border.default}`, padding: "4px" }}
          >
            {profiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <Button variant="primary" size="sm" onClick={addRepo}>Add</Button>
          <Button variant="ghost" size="sm" onClick={() => setAdding(false)}>Cancel</Button>
        </div>
      ) : (
        <Button variant="ghost" size="sm" onClick={() => setAdding(true)} style={{ marginTop: space['3'] }}>
          + Add Repository
        </Button>
      )}
      <div style={{ ...labelStyle, marginTop: space['2'] }}>
        {repos.length} repo(s) configured
      </div>
    </div>
  )
}
