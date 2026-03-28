import React, { useState } from "react"
import { useNavigate } from "react-router-dom"
import { colors, space, textGlow } from "@/styles/tokens"
import { Panel, Button } from "@/components/ui"
import { useReviewStore } from "@/store/reviewStore"
import { useTauriEvents } from "@/hooks/useTauriEvents"
import { useScheduler } from "@/hooks/useScheduler"
import { triggerRunNow } from "@/ipc/review"
import { useConfigStore } from "@/store/configStore"
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard"
import { ShortcutsHelpModal } from "@/components/ui/ShortcutsHelpModal"
import { useHelpShortcut } from "@/hooks/useKeyboardShortcuts"

export default function Dashboard() {
  const { runStatus, progress, lastReportId } = useReviewStore()
  const { nextRunLabel } = useScheduler()
  const { config, saveConfig } = useConfigStore()
  const navigate = useNavigate()
  const [showHelp, setShowHelp] = useState(false)
  const [notifBannerDismissed, setNotifBannerDismissed] = useState(false)
  useTauriEvents()
  useHelpShortcut(() => setShowHelp(true))

  const handleRunNow = async () => {
    try { await triggerRunNow() } catch (e) { console.error(e) }
  }

  const showOnboarding = config && !config.onboardingComplete
  const hasRuns = !!lastReportId

  const headerStyle: React.CSSProperties = {
    fontFamily: "var(--font-display)",
    fontSize: "20px",
    color: colors.text.primary,
    textShadow: textGlow.greenPrimary,
    marginBottom: space['6'],
    letterSpacing: "0.05em",
  }

  const labelStyle: React.CSSProperties = {
    fontFamily: "var(--font-body)",
    fontSize: "11px",
    color: colors.text.tertiary,
    letterSpacing: "0.08em",
    minWidth: "100px",
  }

  const valueStyle: React.CSSProperties = {
    fontFamily: "var(--font-code)",
    fontSize: "12px",
    color: colors.text.secondary,
  }

  const statusColor = runStatus === "running"
    ? colors.status.ahead
    : runStatus === "error"
    ? colors.status.behind
    : colors.status.synced

  const row = (label: string, val: React.ReactNode): React.ReactNode => (
    <div style={{ display: "flex", gap: space['4'], alignItems: "center", marginBottom: space['2'] }}>
      <span style={labelStyle}>{label}</span>
      <span style={valueStyle}>{val}</span>
    </div>
  )

  return (
    <div style={{ padding: space['6'], height: "100%", overflowY: "auto" }}>
      {showOnboarding && (
        <OnboardingWizard onClose={() => {
          if (config) saveConfig({ ...config, onboardingComplete: true })
        }} />
      )}

      <ShortcutsHelpModal open={showHelp} onClose={() => setShowHelp(false)} />

      <div style={headerStyle}>// DASHBOARD</div>

      {/* Notification permission banner */}
      {!notifBannerDismissed && !hasRuns && (
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: `${space['3']} ${space['4']}`,
          border: `1px solid ${colors.status.ahead}44`,
          borderRadius: "6px",
          background: `${colors.status.ahead}08`,
          marginBottom: space['4'],
          fontFamily: "var(--font-body)",
          fontSize: "0.82rem",
        }}>
          <span style={{ color: colors.text.secondary }}>
            Enable macOS notifications to be alerted when reviews complete.
          </span>
          <div style={{ display: "flex", gap: space['2'] }}>
            <Button variant="ghost" size="sm" onClick={() => setNotifBannerDismissed(true)}>
              Dismiss
            </Button>
          </div>
        </div>
      )}

      <Panel rain={{ preset: "diff" }} style={{ padding: space['4'], marginBottom: space['4'] }}>
        {row("STATUS", <span style={{ color: statusColor }}>{runStatus.toUpperCase()}</span>)}
        {row("NEXT RUN", nextRunLabel)}
        {lastReportId && row("LAST REPORT", (
          <span>
            {lastReportId}{" "}
            <Button variant="ghost" size="sm" onClick={() => navigate("/reports")}>View</Button>
          </span>
        ))}

        {runStatus === "running" && (
          <div style={{ marginBottom: space['3'] }}>
            <div style={{ ...labelStyle, marginBottom: space['1'] }}>
              Progress: {progress.done}/{progress.total}
            </div>
            <div style={{
              height: "4px",
              backgroundColor: colors.bg.elevated,
              border: `1px solid ${colors.border.default}`,
              borderRadius: "2px",
              overflow: "hidden",
              width: "240px",
            }}>
              <div style={{
                height: "100%",
                width: `${progress.total > 0 ? (progress.done / progress.total) * 100 : 0}%`,
                backgroundColor: colors.status.synced,
                transition: "width 0.3s ease",
              }} />
            </div>
          </div>
        )}

        <div style={{ marginTop: space['3'] }}>
          <Button variant="primary" onClick={handleRunNow} loading={runStatus === "running"}>
            RUN NOW
          </Button>
        </div>
      </Panel>

      {/* Empty state */}
      {!hasRuns && runStatus === "idle" ? (
        <Panel rain={{ preset: "diff" }} style={{ padding: space['6'], textAlign: "center" as const }}>
          <div style={{
            fontFamily: "var(--font-display)",
            fontSize: "1.5rem",
            color: colors.text.tertiary,
            marginBottom: space['3'],
          }}>
            [ no reviews yet ]
          </div>
          <p style={{ fontFamily: "var(--font-body)", fontSize: "0.85rem", color: colors.text.secondary, marginBottom: space['4'] }}>
            Click <strong style={{ color: colors.text.primary }}>RUN NOW</strong> above to fetch your pending PRs and
            run an AI review. Make sure you've configured at least one repo in{" "}
            <button
              onClick={() => navigate("/configuration")}
              style={{ background: "none", border: "none", color: colors.status.synced, cursor: "pointer", fontFamily: "inherit", fontSize: "inherit" }}
            >
              Configuration
            </button>.
          </p>
          <Button variant="ghost" size="sm" onClick={() => setShowHelp(true)}>
            ? View keyboard shortcuts
          </Button>
        </Panel>
      ) : (
        <Panel rain={{ preset: "diff" }} style={{ padding: space['4'] }}>
          <div style={{ fontFamily: "var(--font-body)", fontSize: "11px", color: colors.text.tertiary, lineHeight: "1.8" }}>
            <div>Configure repos and AI engine in Configuration.</div>
            <div>Run Now fetches open PRs where you are a requested reviewer.</div>
            <div>Results are stored as JSON reports and viewable in Reports.</div>
            <div style={{ marginTop: space['2'] }}>
              <button
                onClick={() => setShowHelp(true)}
                style={{ background: "none", border: "none", color: colors.text.tertiary, cursor: "pointer", fontFamily: "var(--font-body)", fontSize: "11px" }}
              >
                Press ? for keyboard shortcuts
              </button>
            </div>
          </div>
        </Panel>
      )}
    </div>
  )
}
