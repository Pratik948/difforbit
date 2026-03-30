import React, { useEffect, useState, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { colors, space, textGlow } from "@/styles/tokens"
import { Panel, Button, Modal, useToast } from "@/components/ui"
import { listReports, deleteReport, loadReport } from "@/ipc/review"
import type { ReportMeta, Report, PRReview } from "@/types/review"
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

function isWithinDate(dateStr: string, filter: DateFilter): boolean {
  if (filter === "ALL") return true
  const d = new Date(dateStr)
  const now = new Date()
  if (filter === "TODAY") return d.toDateString() === now.toDateString()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  return d >= weekAgo
}

function formatRelativeTime(isoStr: string): string {
  const diff = Math.floor((Date.now() - new Date(isoStr).getTime()) / 1000)
  if (diff < 60) return "just now"
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return new Date(isoStr).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
}

const VERDICT_COLORS: Record<string, string> = {
  APPROVE: colors.status.synced,
  REQUEST_CHANGES: colors.status.behind,
  NEEDS_DISCUSSION: colors.status.modified,
}

const VERDICT_LABELS: Record<string, string> = {
  APPROVE: "Approved",
  REQUEST_CHANGES: "Changes requested",
  NEEDS_DISCUSSION: "Needs discussion",
}

interface ReviewEntry {
  report: Report
  review: PRReview
}

export default function Reports() {
  const [metas, setMetas] = useState<ReportMeta[]>([])
  const [allReports, setAllReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [verdictFilter, setVerdictFilter] = useState<VerdictFilter>("ALL")
  const [dateFilter, setDateFilter] = useState<DateFilter>("ALL")
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set())
  const navigate = useNavigate()
  const { addToast } = useToast()
  const searchFocusRef = useRef<HTMLInputElement | null>(null)

  const toggleFiles = (key: string) => {
    setExpandedFiles(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
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

  // Flatten all reports into individual PR review entries, newest first
  const allEntries: ReviewEntry[] = allReports
    .flatMap(report => report.reviews.map(review => ({ report, review })))
    .sort((a, b) => new Date(b.review.reviewedAt).getTime() - new Date(a.review.reviewedAt).getTime())

  const filteredEntries = allEntries.filter(({ report, review }) => {
    if (!isWithinDate(review.reviewedAt, dateFilter)) return false
    if (verdictFilter !== "ALL" && review.verdict !== verdictFilter) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        review.pr.title.toLowerCase().includes(q) ||
        review.pr.repo.toLowerCase().includes(q) ||
        report.engine.toLowerCase().includes(q) ||
        String(review.pr.number).includes(q)
      )
    }
    return true
  })

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
      {!loading && allEntries.length > 0 && (
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

      {/* PR review cards */}
      {loading ? (
        <div style={{ color: colors.text.tertiary, fontFamily: "var(--font-body, system-ui, sans-serif)", fontSize: "13px" }}>Loading…</div>
      ) : allEntries.length === 0 ? (
        <Panel style={{ padding: space["6"], textAlign: "center" as const }}>
          <div style={{ fontFamily: "var(--font-display, system-ui, sans-serif)", fontSize: "1.1rem", fontWeight: "500", color: colors.text.tertiary, marginBottom: space["3"] }}>
            No reports yet
          </div>
          <p style={{ fontFamily: "var(--font-body, system-ui, sans-serif)", fontSize: "13px", color: colors.text.secondary, marginBottom: space["4"] }}>
            Go to the{" "}
            <button onClick={() => navigate("/")} style={{ background: "none", border: "none", color: colors.status.synced, cursor: "pointer", fontFamily: "inherit", fontSize: "inherit", textDecoration: "underline" }}>
              Dashboard
            </button>{" "}
            and click <strong style={{ color: colors.text.primary }}>Run Now</strong> to generate your first report.
          </p>
        </Panel>
      ) : filteredEntries.length === 0 ? (
        <Panel style={{ padding: space["4"] }}>
          <div style={{ fontFamily: "var(--font-body, system-ui, sans-serif)", fontSize: "13px", color: colors.text.tertiary, textAlign: "center" as const }}>
            No results match your filters.
          </div>
        </Panel>
      ) : (
        <div style={{ display: "flex", flexDirection: "column" as const, gap: space["3"] }}>
          {filteredEntries.map(({ report, review }) => {
            const filesKey = `${report.id}-${review.pr.number}`
            const filesOpen = expandedFiles.has(filesKey)
            const verdictColor = VERDICT_COLORS[review.verdict] ?? colors.text.tertiary
            const verdictLabel = VERDICT_LABELS[review.verdict] ?? review.verdict

            return (
              <Panel key={filesKey} style={{ padding: space["4"] }}>
                {/* Row 1: PR title + number */}
                <div style={{ display: "flex", alignItems: "baseline", gap: space["2"], marginBottom: space["2"] }}>
                  <span style={{
                    fontFamily: "var(--font-code, monospace)",
                    fontSize: "11px",
                    color: colors.text.ghost,
                    flexShrink: 0,
                  }}>
                    #{review.pr.number}
                  </span>
                  <span style={{
                    fontFamily: "var(--font-display, 'Inter', system-ui, sans-serif)",
                    fontSize: "15px",
                    fontWeight: "600",
                    color: colors.text.primary,
                    lineHeight: "1.3",
                  }}>
                    {review.pr.title}
                  </span>
                </div>

                {/* Row 2: time · status tag · repo · engine */}
                <div style={{ display: "flex", alignItems: "center", gap: space["3"], marginBottom: space["3"], flexWrap: "wrap" as const }}>
                  <span style={{ fontFamily: "var(--font-body, system-ui, sans-serif)", fontSize: "12px", color: colors.text.tertiary }}>
                    {formatRelativeTime(review.reviewedAt)}
                  </span>
                  <span style={{
                    display: "inline-block",
                    fontFamily: "var(--font-body, system-ui, sans-serif)",
                    fontSize: "11px",
                    fontWeight: "600",
                    color: verdictColor,
                    border: `1px solid ${verdictColor}55`,
                    borderRadius: "4px",
                    padding: `1px ${space["2"]}`,
                    background: `${verdictColor}0d`,
                  }}>
                    {verdictLabel}
                  </span>
                  <span style={{ fontFamily: "var(--font-code, monospace)", fontSize: "11px", color: colors.text.tertiary }}>
                    {review.pr.repo}
                  </span>
                  <span style={{ fontFamily: "var(--font-body, system-ui, sans-serif)", fontSize: "11px", color: colors.text.ghost }}>
                    {report.engine}
                  </span>
                </div>

                {/* Row 3: actions */}
                <div style={{ display: "flex", alignItems: "center", gap: space["2"], borderTop: `1px solid ${colors.border.default}`, paddingTop: space["3"] }}>
                  <Button variant="ghost" size="sm" onClick={() => navigate(`/reports/${report.id}`)}>
                    View
                  </Button>
                  <Button variant="danger" size="sm" onClick={() => setConfirmDelete(report.id)}>
                    Delete
                  </Button>
                  {review.pr.files.length > 0 && (
                    <Button variant="ghost" size="sm" onClick={() => toggleFiles(filesKey)}>
                      {filesOpen ? "▼" : "▶"} Files ({review.pr.files.length})
                    </Button>
                  )}
                  <a
                    href={review.pr.url}
                    target="_blank"
                    rel="noreferrer"
                    style={{ marginLeft: "auto", fontFamily: "var(--font-body, system-ui, sans-serif)", fontSize: "11px", color: colors.status.ahead, textDecoration: "none" }}
                  >
                    Open on GitHub ↗
                  </a>
                </div>

                {/* Expanded files list */}
                {filesOpen && (
                  <div style={{
                    marginTop: space["3"],
                    padding: space["3"],
                    background: colors.bg.elevated,
                    borderRadius: "4px",
                    border: `1px solid ${colors.border.subtle}`,
                  }}>
                    {review.pr.files.map(f => (
                      <div key={f} style={{
                        fontFamily: "var(--font-code, monospace)",
                        fontSize: "12px",
                        color: colors.text.secondary,
                        padding: `2px 0`,
                        borderBottom: `1px solid ${colors.border.subtle}`,
                      }}>
                        {f}
                      </div>
                    ))}
                  </div>
                )}
              </Panel>
            )
          })}
        </div>
      )}

      <Modal open={confirmDelete !== null} onClose={() => setConfirmDelete(null)} title="Delete Report" size="sm">
        <p style={{ fontFamily: "var(--font-body, system-ui, sans-serif)", fontSize: "13px", color: colors.text.secondary, marginBottom: space["4"] }}>
          Delete this report? All PR reviews in this run will be removed. This cannot be undone.
        </p>
        <div style={{ display: "flex", gap: space["2"] }}>
          <Button variant="danger" onClick={() => confirmDelete && handleDelete(confirmDelete)}>Delete</Button>
          <Button variant="ghost" onClick={() => setConfirmDelete(null)}>Cancel</Button>
        </div>
      </Modal>
    </div>
  )
}
