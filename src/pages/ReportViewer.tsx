import React, { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { colors, space, textGlow } from "@/styles/tokens"
import { Button, useToast } from "@/components/ui"
import { loadReport } from "@/ipc/review"
import type { Report } from "@/types/review"
import PRCard from "@/components/review/PRCard"

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
    marginBottom: space['2'],
  }

  if (loading) return (
    <div style={{ padding: space['6'], color: colors.text.tertiary, fontFamily: "monospace", fontSize: "12px" }}>
      Loading report…
    </div>
  )
  if (!report) return (
    <div style={{ padding: space['6'], color: colors.status.behind, fontFamily: "monospace", fontSize: "12px" }}>
      Report not found.
    </div>
  )

  return (
    <div style={{ padding: space['6'], height: "100%", overflowY: "auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: space['3'], marginBottom: space['4'] }}>
        <Button variant="ghost" size="sm" onClick={() => navigate("/reports")}>← Reports</Button>
      </div>
      <div style={headerStyle}>// REPORT</div>
      <div style={{ fontFamily: "var(--font-body, monospace)", fontSize: "11px", color: colors.text.tertiary, marginBottom: space['6'] }}>
        {new Date(report.runAt).toLocaleString()} · {report.reviews.length} PR(s) · {report.engine}
      </div>

      {report.reviews.map((review, i) => (
        <PRCard key={i} review={review} />
      ))}

      {report.reviews.length === 0 && (
        <div style={{ fontFamily: "var(--font-body, monospace)", fontSize: "12px", color: colors.text.tertiary }}>
          No reviews in this report.
        </div>
      )}
    </div>
  )
}
