import React, { useEffect, useState, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { colors, space, textGlow } from "@/styles/tokens"
import { Panel, Button, Modal, useToast } from "@/components/ui"
import { listReports, deleteReport, loadReport } from "@/ipc/review"
import type { ReportMeta, Report } from "@/types/review"
import { SearchBar } from "@/components/reports/SearchBar"
import { FilterBar, type VerdictFilter, type DateFilter } from "@/components/reports/FilterBar"

interface Stats {
  totalPrs: number
  approve: number
  requestChanges: number
  needsDiscussion: number
  highIssues: number
  mediumIssues: number
  lowIssues: number
  avgIssuesPerPr: number
  repoCount: Record<string, number>
}

function computeStats(reports: Report[]): Stats {
  let totalPrs = 0, approve = 0, requestChanges = 0, needsDiscussion = 0
  let highIssues = 0, mediumIssues = 0, lowIssues = 0
  const repoCount: Record<string, number> = {}

  for (const report of reports) {
    for (const review of report.reviews) {
      totalPrs++
      if (review.verdict === "APPROVE") approve++
      else if (review.verdict === "REQUEST_CHANGES") requestChanges++
      else needsDiscussion++
      repoCount[review.pr.repo] = (repoCount[review.pr.repo] ?? 0) + 1
      for (const issue of review.issues) {
        if (issue.severity === "High") highIssues++
        else if (issue.severity === "Medium") mediumIssues++
        else lowIssues++
      }
    }
  }

  return {
    totalPrs, approve, requestChanges, needsDiscussion,
    highIssues, mediumIssues, lowIssues,
    avgIssuesPerPr: totalPrs > 0
      ? Math.round((highIssues + mediumIssues + lowIssues) / totalPrs * 10) / 10
      : 0,
    repoCount,
  }
}

function isWithinDate(runAt: string, filter: DateFilter): boolean {
  if (filter === "ALL") return true
  const d = new Date(runAt)
  const now = new Date()
  if (filter === "TODAY") {
    return d.toDateString() === now.toDateString()
  }
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  return d >= weekAgo
}

export default function Reports() {
  const [metas, setMetas] = useState<ReportMeta[]>([])
  const [allReports, setAllReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [verdictFilter, setVerdictFilter] = useState<VerdictFilter>("ALL")
  const [dateFilter, setDateFilter] = useState<DateFilter>("ALL")
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const navigate = useNavigate()
  const { addToast } = useToast()
  const searchFocusRef = useRef<HTMLInputElement | null>(null)

  const toggleExpanded = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const el = document.activeElement
      const inInput = el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA")
      if (e.key === "/" && !inInput) {
        e.preventDefault()
        searchFocusRef.current?.focus()
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [])

  const load = async () => {
    try {
      const metaList = await listReports()
      setMetas(metaList)
      const full = await Promise.all(metaList.map(m => loadReport(m.id).catch(() => null)))
      setAllReports(full.filter(Boolean) as Report[])
    } catch (e) {
      addToast({ variant: "error", message: String(e) })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleDelete = async (id: string) => {
    try {
      await deleteReport(id)
      setMetas(prev => prev.filter(r => r.id !== id))
      setAllReports(prev => prev.filter(r => r.id !== id))
      addToast({ variant: "success", message: "Report deleted." })
    } catch (e) {
      addToast({ variant: "error", message: String(e) })
    } finally {
      setConfirmDelete(null)
    }
  }

  const filteredMetas = metas.filter(meta => {
    if (!isWithinDate(meta.runAt, dateFilter)) return false
    if (search) {
      const q = search.toLowerCase()
      if (meta.engine.toLowerCase().includes(q) || meta.runAt.toLowerCase().includes(q)) return true
      // Also search PR titles and repo names from full report data
      const fullReport = allReports.find(r => r.id === meta.id)
      if (fullReport) {
        return fullReport.reviews.some(rv =>
          rv.pr.title.toLowerCase().includes(q) || rv.pr.repo.toLowerCase().includes(q)
        )
      }
      return false
    }
    return true
  })

  const verdictFilteredIds = verdictFilter === "ALL"
    ? null
    : new Set(
        allReports
          .filter(r => r.reviews.some(rv => rv.verdict === verdictFilter))
          .map(r => r.id)
      )

  const visibleMetas = verdictFilteredIds
    ? filteredMetas.filter(m => verdictFilteredIds.has(m.id))
    : filteredMetas

  const stats = computeStats(allReports)
  const topRepos = Object.entries(stats.repoCount).sort((a, b) => b[1] - a[1]).slice(0, 5)

  const headerStyle: React.CSSProperties = {
    fontFamily: "var(--font-display, 'Inter', system-ui, sans-serif)",
    fontSize: "22px",
    fontWeight: "600",
    color: colors.text.primary,
    textShadow: textGlow.greenPrimary,
    marginBottom: space["4"],
    letterSpacing: "-0.01em",
  }

  const sectionHead: React.CSSProperties = {
    fontFamily: "var(--font-body, system-ui, sans-serif)",
    fontSize: "11px",
    fontWeight: "600",
    color: colors.text.tertiary,
    letterSpacing: "0.04em",
    textTransform: "uppercase" as const,
    marginBottom: space["3"],
  }

  const statRow = (label: string, value: React.ReactNode, color?: string): React.ReactNode => (
    <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--font-body, system-ui, sans-serif)", fontSize: "13px", marginBottom: space["1"] }}>
      <span style={{ color: colors.text.tertiary }}>{label}</span>
      <span style={{ fontFamily: "var(--font-code, monospace)", color: color ?? colors.text.primary }}>{value}</span>
    </div>
  )

  const rowStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: space["4"],
    padding: `${space["3"]} ${space["4"]}`,
    borderBottom: `1px solid ${colors.border.default}`,
    fontFamily: "var(--font-body, system-ui, sans-serif)",
    fontSize: "13px",
  }

  return (
    <div style={{ padding: space["6"], height: "100%", overflowY: "auto" }}>
      <h1 style={headerStyle}>Reports</h1>

      {/* Stats */}
      {!loading && stats.totalPrs > 0 && (
        <div style={{ display: "flex", gap: space["4"], marginBottom: space["6"], flexWrap: "wrap" as const }}>
          <Panel style={{ padding: space["4"], flex: 1, minWidth: "180px" }}>
            <div style={sectionHead}>Verdicts</div>
            {statRow("Total PRs reviewed", stats.totalPrs)}
            {statRow("Approved", stats.approve, colors.status.synced)}
            {statRow("Request Changes", stats.requestChanges, colors.status.behind)}
            {statRow("Needs Discussion", stats.needsDiscussion, colors.status.modified)}
          </Panel>
          <Panel style={{ padding: space["4"], flex: 1, minWidth: "180px" }}>
            <div style={sectionHead}>Issues</div>
            {statRow("High severity", stats.highIssues, colors.status.behind)}
            {statRow("Medium severity", stats.mediumIssues, colors.status.modified)}
            {statRow("Low severity", stats.lowIssues, colors.status.synced)}
            {statRow("Avg per PR", stats.avgIssuesPerPr)}
          </Panel>
          {topRepos.length > 0 && (
            <Panel style={{ padding: space["4"], flex: 1, minWidth: "200px" }}>
              <div style={sectionHead}>Top Repos</div>
              {topRepos.map(([repo, count]) =>
                statRow(repo.split("/")[1] ?? repo, `${count} PR${count !== 1 ? "s" : ""}`)
              )}
            </Panel>
          )}
        </div>
      )}

      {/* Search + Filter */}
      {!loading && metas.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column" as const, gap: space["3"], marginBottom: space["4"] }}>
          <SearchBar value={search} onChange={setSearch} focusRef={searchFocusRef} />
          <FilterBar
            verdict={verdictFilter}
            date={dateFilter}
            onVerdictChange={setVerdictFilter}
            onDateChange={setDateFilter}
          />
        </div>
      )}

      {/* Report list */}
      {loading ? (
        <div style={{ color: colors.text.tertiary, fontFamily: "var(--font-body, system-ui, sans-serif)", fontSize: "13px" }}>Loading…</div>
      ) : metas.length === 0 ? (
        <Panel style={{ padding: space["6"], textAlign: "center" as const }}>
          <div style={{
            fontFamily: "var(--font-display, system-ui, sans-serif)",
            fontSize: "1.1rem",
            fontWeight: "500",
            color: colors.text.tertiary,
            marginBottom: space["3"],
          }}>
            No reports yet
          </div>
          <p style={{ fontFamily: "var(--font-body, system-ui, sans-serif)", fontSize: "13px", color: colors.text.secondary, marginBottom: space["4"] }}>
            No review reports found. Go to the{" "}
            <button
              onClick={() => navigate("/")}
              style={{ background: "none", border: "none", color: colors.status.synced, cursor: "pointer", fontFamily: "inherit", fontSize: "inherit", textDecoration: "underline" }}
            >
              Dashboard
            </button>{" "}
            and click <strong style={{ color: colors.text.primary }}>Run Now</strong> to generate your first report.
          </p>
        </Panel>
      ) : visibleMetas.length === 0 ? (
        <Panel style={{ padding: space["4"] }}>
          <div style={{ fontFamily: "var(--font-body, system-ui, sans-serif)", fontSize: "13px", color: colors.text.tertiary, textAlign: "center" as const }}>
            No reports match your filters. Try a different search or filter.
          </div>
        </Panel>
      ) : (
        <Panel>
          <div style={{ ...rowStyle, color: colors.text.tertiary, fontSize: "11px", fontWeight: "600" }}>
            <span style={{ flex: 2 }}>Run at</span>
            <span style={{ flex: 1 }}>PRs</span>
            <span style={{ flex: 2 }}>Engine</span>
            <span style={{ width: "160px" }}></span>
          </div>
          {visibleMetas.map(r => {
            const fullReport = allReports.find(rep => rep.id === r.id)
            const expanded = expandedIds.has(r.id)
            return (
              <React.Fragment key={r.id}>
                <div style={rowStyle}>
                  <span style={{ flex: 2, color: colors.text.secondary }}>
                    {new Date(r.runAt).toLocaleString()}
                  </span>
                  <span style={{ flex: 1, color: colors.status.synced }}>{r.prCount}</span>
                  <span style={{ flex: 2, color: colors.text.tertiary }}>{r.engine}</span>
                  <div style={{ display: "flex", gap: space["2"], width: "160px" }}>
                    {fullReport && fullReport.reviews.length > 0 && (
                      <Button variant="ghost" size="sm" onClick={() => toggleExpanded(r.id)}>
                        {expanded ? "▼ PRs" : "▶ PRs"}
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => navigate(`/reports/${r.id}`)}>View</Button>
                    <Button variant="danger" size="sm" onClick={() => setConfirmDelete(r.id)}>Delete</Button>
                  </div>
                </div>
                {expanded && fullReport && (
                  <div style={{
                    paddingLeft: space["6"],
                    paddingRight: space["4"],
                    paddingBottom: space["3"],
                    borderBottom: `1px solid ${colors.border.default}`,
                    background: `${colors.bg.elevated}44`,
                  }}>
                    {fullReport.reviews.map(rv => {
                      const verdictColor = rv.verdict === "APPROVE"
                        ? colors.status.synced
                        : rv.verdict === "REQUEST_CHANGES"
                        ? colors.status.behind
                        : colors.status.modified
                      return (
                        <div
                          key={rv.pr.number}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: space["3"],
                            fontFamily: "var(--font-body, system-ui, sans-serif)",
                            fontSize: "12px",
                            padding: `${space["1"]} 0`,
                            borderBottom: `1px solid ${colors.border.subtle}`,
                          }}
                        >
                          <span style={{ color: colors.text.ghost, fontFamily: "var(--font-code, monospace)" }}>#{rv.pr.number}</span>
                          <span style={{ color: colors.text.secondary, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{rv.pr.title}</span>
                          <span style={{ color: colors.text.tertiary }}>{rv.pr.repo}</span>
                          <span style={{
                            color: verdictColor,
                            border: `1px solid ${verdictColor}44`,
                            borderRadius: "3px",
                            padding: "1px 6px",
                            fontSize: "10px",
                            fontWeight: "600",
                            whiteSpace: "nowrap" as const,
                          }}>
                            {rv.verdict}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </React.Fragment>
            )
          })}
        </Panel>
      )}

      <Modal open={confirmDelete !== null} onClose={() => setConfirmDelete(null)} title="Delete Report" size="sm">
        <p style={{ fontFamily: "var(--font-body, system-ui, sans-serif)", fontSize: "13px", color: colors.text.secondary, marginBottom: space["4"] }}>
          Delete this report? This cannot be undone.
        </p>
        <div style={{ display: "flex", gap: space["2"] }}>
          <Button variant="danger" onClick={() => confirmDelete && handleDelete(confirmDelete)}>Delete</Button>
          <Button variant="ghost" onClick={() => setConfirmDelete(null)}>Cancel</Button>
        </div>
      </Modal>
    </div>
  )
}
