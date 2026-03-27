import React, { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { colors, space, textGlow } from "@matrixui/tokens"
import { Panel, Button, Modal, useToast } from "@matrixui/react"
import { listReports, deleteReport } from "@/ipc/review"
import type { ReportMeta } from "@/types/review"

export default function Reports() {
  const [reports, setReports] = useState<ReportMeta[]>([])
  const [loading, setLoading] = useState(true)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const navigate = useNavigate()
  const { addToast } = useToast()

  const load = async () => {
    try {
      const data = await listReports()
      setReports(data)
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
      addToast({ variant: "success", message: "Report deleted." })
    } catch (e) {
      addToast({ variant: "error", message: String(e) })
    } finally {
      setConfirmDelete(null)
    }
  }

  const headerStyle: React.CSSProperties = {
    fontFamily: "var(--font-display, 'Share Tech Mono', monospace)",
    fontSize: "20px",
    color: colors.text.primary,
    textShadow: textGlow.greenPrimary,
    marginBottom: space['6'],
    letterSpacing: "0.05em",
  }

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
          {/* Header row */}
          <div style={{ ...rowStyle, color: colors.text.tertiary, fontSize: "10px", letterSpacing: "0.1em", borderBottom: `1px solid ${colors.border.default}` }}>
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

      <Modal
        open={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        title="Delete Report"
        size="sm"
      >
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
