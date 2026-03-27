import React, { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { colors, space, textGlow } from "@matrixui/tokens"
import { Panel, Button, Modal, useToast } from "@matrixui/react"
import { listReports, deleteReport, loadReport } from "@/ipc/review"
import type { ReportMeta, Report } from "@/types/review"

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
    avgIssuesPerPr: totalPrs > 0 ? Math.round((highIssues + mediumIssues + lowIssues) / totalPrs * 10) / 10 : 0,
    repoCount,
  }
}

export default function Reports() {
  const [reports, setReports] = useState<ReportMeta[]>([])
  const [allReports, setAllReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const navigate = useNavigate()
  const { addToast } = useToast()

  const load = async () => {
    try {
      const metas = await listReports()
      setReports(metas)
      // Load full reports for stats (lightweight for typical use)
      const full = await Promise.all(metas.map(m => loadReport(m.id).catch(() => null)))
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
      setReports(prev => prev.filter(r => r.id !== id))
      setAllReports(prev => prev.filter(r => r.id !== id))
      addToast({ variant: "success", message: "Report deleted." })
    } catch (e) {
      addToast({ variant: "error", message: String(e) })
    } finally {
      setConfirmDelete(null)
    }
  }

  const stats = computeStats(allReports)
  const topRepos = Object.entries(stats.repoCount).sort((a, b) => b[1] - a[1]).slice(0, 5)

  const headerStyle: React.CSSProperties = {
    fontFamily: "var(--font-display, 'Share Tech Mono', monospace)",
    fontSize: "20px",
    color: colors.text.primary,
    textShadow: textGlow.greenPrimary,
    marginBottom: space['4'],
    letterSpacing: "0.05em",
  }

  const sectionHead: React.CSSProperties = {
    fontFamily: "var(--font-display, monospace)",
    fontSize: "11px",
    color: colors.text.tertiary,
    letterSpacing: "0.12em",
    marginBottom: space['3'],
  }

  const statRow = (label: string, value: React.ReactNode, color?: string): React.ReactNode => (
    <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--font-body, monospace)", fontSize: "12px", marginBottom: space['1'] }}>
      <span style={{ color: colors.text.tertiary }}>{label}</span>
      <span style={{ fontFamily: "var(--font-code, monospace)", color: color ?? colors.text.primary }}>{value}</span>
    </div>
  )

  const rowStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: space['4'],
    padding: `${space['3']} ${space['4']}`,
    borderBottom: `1px solid ${colors.border.default}`,
    fontFamily: "var(--font-body, monospace)",
    fontSize: "12px",
  }

  return (
    <div style={{ padding: space['6'], height: "100%", overflowY: "auto" }}>
      <div style={headerStyle}>// REPORTS</div>

      {/* Stats section */}
      {!loading && stats.totalPrs > 0 && (
        <div style={{ display: "flex", gap: space['4'], marginBottom: space['6'], flexWrap: "wrap" }}>
          <Panel rain={{ preset: "diff" }} style={{ padding: space['4'], flex: 1, minWidth: "180px" }}>
            <div style={sectionHead}>VERDICTS</div>
            {statRow("Total PRs reviewed", stats.totalPrs)}
            {statRow("Approved", stats.approve, colors.status.synced)}
            {statRow("Request Changes", stats.requestChanges, colors.status.behind)}
            {statRow("Needs Discussion", stats.needsDiscussion, colors.status.modified)}
          </Panel>
          <Panel rain={{ preset: "diff" }} style={{ padding: space['4'], flex: 1, minWidth: "180px" }}>
            <div style={sectionHead}>ISSUES</div>
            {statRow("High severity", stats.highIssues, colors.status.behind)}
            {statRow("Medium severity", stats.mediumIssues, colors.status.modified)}
            {statRow("Low severity", stats.lowIssues, colors.status.synced)}
            {statRow("Avg per PR", stats.avgIssuesPerPr)}
          </Panel>
          {topRepos.length > 0 && (
            <Panel rain={{ preset: "diff" }} style={{ padding: space['4'], flex: 1, minWidth: "200px" }}>
              <div style={sectionHead}>TOP REPOS</div>
              {topRepos.map(([repo, count]) => statRow(repo.split('/')[1] ?? repo, `${count} PR${count !== 1 ? "s" : ""}`))}
            </Panel>
          )}
        </div>
      )}

      {/* Report list */}
      {loading ? (
        <div style={{ color: colors.text.tertiary, fontFamily: "monospace", fontSize: "12px" }}>Loading…</div>
      ) : reports.length === 0 ? (
        <Panel rain={{ preset: "diff" }} style={{ padding: space['4'] }}>
          <div style={{ fontFamily: "var(--font-body, monospace)", fontSize: "12px", color: colors.text.tertiary }}>
            No reports yet. Run a review from the Dashboard.
          </div>
        </Panel>
      ) : (
        <Panel rain={{ preset: "diff" }}>
          <div style={{ ...rowStyle, color: colors.text.tertiary, fontSize: "10px", letterSpacing: "0.1em" }}>
            <span style={{ flex: 2 }}>RUN AT</span>
            <span style={{ flex: 1 }}>PRs</span>
            <span style={{ flex: 2 }}>ENGINE</span>
            <span style={{ width: "120px" }}></span>
          </div>
          {reports.map(r => (
            <div key={r.id} style={rowStyle}>
              <span style={{ flex: 2, color: colors.text.secondary, fontFamily: "var(--font-code, monospace)" }}>
                {new Date(r.runAt).toLocaleString()}
              </span>
              <span style={{ flex: 1, color: colors.status.synced }}>{r.prCount}</span>
              <span style={{ flex: 2, color: colors.text.tertiary }}>{r.engine}</span>
              <div style={{ display: "flex", gap: space['2'], width: "120px" }}>
                <Button variant="ghost" size="sm" onClick={() => navigate(`/reports/${r.id}`)}>View</Button>
                <Button variant="danger" size="sm" onClick={() => setConfirmDelete(r.id)}>Del</Button>
              </div>
            </div>
          ))}
        </Panel>
      )}

      <Modal open={confirmDelete !== null} onClose={() => setConfirmDelete(null)} title="Delete Report" size="sm">
        <p style={{ fontFamily: "var(--font-body, monospace)", fontSize: "12px", color: colors.text.secondary, marginBottom: space['4'] }}>
          Delete this report? This cannot be undone.
        </p>
        <div style={{ display: "flex", gap: space['2'] }}>
          <Button variant="danger" onClick={() => confirmDelete && handleDelete(confirmDelete)}>Delete</Button>
          <Button variant="ghost" onClick={() => setConfirmDelete(null)}>Cancel</Button>
        </div>
      </Modal>
    </div>
  )
}
