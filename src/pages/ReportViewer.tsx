import React, { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { colors, space, textGlow } from "@/styles/tokens"
import { Button, useToast } from "@/components/ui"
import { loadReport } from "@/ipc/review"
import type { Report } from "@/types/review"
import PRCard from "@/components/review/PRCard"

export default function ReportViewer() {
  const { id, prNumber } = useParams<{ id: string; prNumber?: string }>()
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
    fontFamily: "var(--font-display, 'Inter', system-ui, sans-serif)",
    fontSize: "22px",
    fontWeight: "600",
    color: colors.text.primary,
    textShadow: textGlow.greenPrimary,
    marginBottom: space["2"],
    letterSpacing: "-0.01em",
  }

  if (loading) return (
    <div style={{ padding: space["6"], color: colors.text.tertiary, fontFamily: "var(--font-body, system-ui, sans-serif)", fontSize: "13px" }}>
      Loading…
    </div>
  )
  if (!report) return (
    <div style={{ padding: space["6"], color: colors.status.behind, fontFamily: "var(--font-body, system-ui, sans-serif)", fontSize: "13px" }}>
      Report not found.
    </div>
  )

  return (
    <div style={{ padding: space["6"], height: "100%", overflowY: "auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: space["3"], marginBottom: space["4"] }}>
        <Button variant="ghost" size="sm" onClick={() => navigate("/reports")}>&larr; Reports</Button>
      </div>
      <h1 style={headerStyle}>Report</h1>
      <div style={{ fontFamily: "var(--font-body, system-ui, sans-serif)", fontSize: "13px", color: colors.text.tertiary, marginBottom: space["6"] }}>
        {new Date(report.runAt).toLocaleString()} &middot; {report.engine}
      </div>

      {(() => {
        const reviews = prNumber
          ? report.reviews.filter(r => String(r.pr.number) === prNumber)
          : report.reviews
        if (reviews.length === 0) return (
          <div style={{ fontFamily: "var(--font-body, system-ui, sans-serif)", fontSize: "13px", color: colors.text.tertiary }}>
            No reviews found.
          </div>
        )
        return reviews.map((review, i) => <PRCard key={i} review={review} />)
      })()}
    </div>
  )
}
