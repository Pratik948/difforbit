import React, { useState } from "react"
import { colors, space } from "@/styles/tokens"
import { Button, Input, Switch } from "@/components/ui"
import type { RepoConfig, ReviewProfile, AutoAction } from "@/types/config"

interface RepoListProps {
  repos: RepoConfig[]
  profiles: ReviewProfile[]
  onChange: (repos: RepoConfig[]) => void
}

const AUTO_ACTION_LABELS: Record<AutoAction, string> = {
  none: "No action",
  approve: "Auto-approve",
  request_changes: "Auto-request changes",
}

export default function RepoList({ repos, profiles, onChange }: RepoListProps) {
  const [adding, setAdding] = useState(false)
  const [newOwner, setNewOwner] = useState("")
  const [newRepo, setNewRepo] = useState("")
  const [newProfile, setNewProfile] = useState(profiles[0]?.id ?? "")
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null)

  const labelStyle: React.CSSProperties = {
    fontFamily: "var(--font-body, monospace)",
    fontSize: "11px",
    color: colors.text.tertiary,
    letterSpacing: "0.08em",
  }

  const rowStyle: React.CSSProperties = {
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
      autoPostComments: false,
      autoAction: "none",
    }
    onChange([...repos, entry])
    setNewOwner("")
    setNewRepo("")
    setAdding(false)
  }

  const update = (idx: number, patch: Partial<RepoConfig>) => {
    onChange(repos.map((r, i) => i === idx ? { ...r, ...patch } : r))
  }

  const removeRepo = (idx: number) => {
    onChange(repos.filter((_, i) => i !== idx))
  }

  return (
    <div>
      {repos.map((r, idx) => {
        const isExpanded = expandedIdx === idx
        return (
          <div key={idx} style={rowStyle}>
            {/* Main row */}
            <div style={{ display: "flex", alignItems: "center", gap: space["3"], padding: `${space["2"]} 0` }}>
              <span style={{ flex: 1 }}>{r.owner}/{r.repo}</span>
              <select
                value={r.profileId}
                onChange={e => update(idx, { profileId: e.target.value })}
                style={{ fontFamily: "var(--font-body, monospace)", fontSize: "11px", backgroundColor: colors.bg.surface, color: colors.text.secondary, border: `1px solid ${colors.border.default}`, padding: "2px 4px" }}
              >
                {profiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <Switch checked={r.enabled} onChange={() => update(idx, { enabled: !r.enabled })} label="" />
              <button
                onClick={() => setExpandedIdx(isExpanded ? null : idx)}
                title="Auto-action settings"
                style={{ background: "none", border: `1px solid ${colors.border.default}`, borderRadius: "3px", padding: `1px ${space["1"]}`, cursor: "pointer", color: colors.text.tertiary, fontSize: "10px" }}
              >
                ⚙
              </button>
              <Button variant="danger" size="sm" onClick={() => removeRepo(idx)}>×</Button>
            </div>
            {/* Expanded auto-action settings */}
            {isExpanded && (
              <div style={{ padding: `${space["2"]} 0 ${space["3"]} ${space["4"]}`, display: "flex", flexDirection: "column", gap: space["2"] }}>
                <div style={{ display: "flex", alignItems: "center", gap: space["3"] }}>
                  <span style={{ ...labelStyle, minWidth: "130px" }}>Auto-post comments</span>
                  <Switch
                    checked={r.autoPostComments ?? false}
                    onChange={() => update(idx, { autoPostComments: !(r.autoPostComments ?? false) })}
                    label=""
                  />
                  <span style={{ ...labelStyle, fontSize: "10px" }}>Post selected issues as comments automatically after review</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: space["3"] }}>
                  <span style={{ ...labelStyle, minWidth: "130px" }}>Auto-action</span>
                  <select
                    value={r.autoAction ?? "none"}
                    onChange={e => update(idx, { autoAction: e.target.value as AutoAction })}
                    style={{ fontFamily: "var(--font-body, monospace)", fontSize: "11px", backgroundColor: colors.bg.surface, color: colors.text.secondary, border: `1px solid ${colors.border.default}`, padding: "2px 6px" }}
                  >
                    {(Object.keys(AUTO_ACTION_LABELS) as AutoAction[]).map(k => (
                      <option key={k} value={k}>{AUTO_ACTION_LABELS[k]}</option>
                    ))}
                  </select>
                  <span style={{ ...labelStyle, fontSize: "10px" }}>Automatically approve or request changes based on AI verdict</span>
                </div>
              </div>
            )}
          </div>
        )
      })}
      {adding ? (
        <div style={{ display: "flex", gap: space["2"], marginTop: space["3"], flexWrap: "wrap" }}>
          <Input value={newOwner} onChange={e => setNewOwner(e.target.value)} placeholder="owner" style={{ width: "120px" }} />
          <Input value={newRepo} onChange={e => setNewRepo(e.target.value)} placeholder="repo" style={{ width: "140px" }} />
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
        <Button variant="ghost" size="sm" onClick={() => setAdding(true)} style={{ marginTop: space["3"] }}>
          + Add Repository
        </Button>
      )}
      <div style={{ ...labelStyle, marginTop: space["2"] }}>
        {repos.length} repo(s) configured
      </div>
    </div>
  )
}
