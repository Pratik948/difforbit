import React, { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { colors, space, textGlow } from "@matrixui/tokens"
import { Panel, Button, useToast } from "@matrixui/react"
import { loadReport } from "@/ipc/review"
import type { Report } from "@/types/review"

export default function ReportViewer() {
  const { id } = useParams<{ id: string }>()
  const [report, setReport] = useState<Report | null>(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const { addToast } = useToast()

  useEffect(() => {
    if (!id) return
    loadReport(id)
      .then(setReport)
      .catch(e => addToast({ variant: "error", message: String(e) }))
      .finally(() => setLoading(false))
  }, [id])

  const headerStyle: React.CSSProperties = {
    fontFamily: "var(--font-display, 'Share Tech Mono', monospace)",
    fontSize: "20px",
    color: colors.text.primary,
    textShadow: textGlow.greenPrimary,
    marginBottom: space['4'],
  }

  if (loading) return <div style={{ padding: space['6'], color: colors.text.tertiary, fontFamily: "monospace" }}>Loading…</div>
  if (!report) return <div style={{ padding: space['6'], color: colors.status.behind, fontFamily: "monospace" }}>Report not found.</div>

  return (
    <div style={{ padding: space['6'], height: "100%", overflowY: "auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: space['4'], marginBottom: space['2'] }}>
        <Button variant="ghost" size="sm" onClick={() => navigate("/reports")}>← Back</Button>
      </div>
      <div style={headerStyle}>// REPORT — {new Date(report.runAt).toLocaleString()}</div>
      <div style={{ fontFamily: "var(--font-body, monospace)", fontSize: "11px", color: colors.text.tertiary, marginBottom: space['6'] }}>
        {report.reviews.length} PR(s) · {report.engine}
      </div>

      {report.reviews.map((review, i) => (
        <Panel key={i} rain={{ preset: "diff" }} style={{ marginBottom: space['4'], padding: space['4'] }}>
          <div style={{ fontFamily: "var(--font-display, monospace)", fontSize: "14px", color: colors.text.primary, marginBottom: space['2'] }}>
            #{review.pr.number} — {review.pr.title}
          </div>
          <div style={{ fontFamily: "var(--font-body, monospace)", fontSize: "11px", color: colors.text.tertiary, marginBottom: space['3'] }}>
            {review.pr.repo} · {review.pr.author} · verdict: <span style={{ color: review.verdict === "APPROVE" ? colors.status.synced : review.verdict === "REQUEST_CHANGES" ? colors.status.behind : colors.status.modified }}>{review.verdict}</span>
          </div>
          <div style={{ fontFamily: "var(--font-body, monospace)", fontSize: "12px", color: colors.text.secondary, marginBottom: space['3'] }}>{review.summary}</div>
          <div style={{ fontFamily: "var(--font-body, monospace)", fontSize: "11px", color: colors.text.tertiary }}>
            {review.issues.length} issue(s) · {review.positiveNotes.length} positive note(s)
          </div>
        </Panel>
      ))}
    </div>
  )
}
