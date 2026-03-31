import React, { useState } from "react"
import { colors, space, textGlow } from "@/styles/tokens"
import { Panel, Button, Modal, useToast } from "@/components/ui"
import type { PRReview } from "@/types/review"
import VerdictBadge from "./VerdictBadge"
import IssueCard from "./IssueCard"
import { postInlineComments, approvePr, approvePrWithBody, requestChanges } from "@/ipc/github"
import type { CommentData } from "@/ipc/github"
import { triggerForceRun } from "@/ipc/review"
import { prReviewToMarkdown, saveMarkdown, printAsPdf } from "@/utils/exportReview"

interface PRCardProps {
  review: PRReview
}

interface ActionState {
  commentsPosted: boolean
  approved: boolean
  changesRequested: boolean
  at: string | null
}

const actionedKey = (review: PRReview) => `difforbit-actioned-${review.pr.repo}-${review.pr.number}`

function loadActionState(review: PRReview): ActionState {
  const empty: ActionState = { commentsPosted: false, approved: false, changesRequested: false, at: null }
  try {
    const raw = localStorage.getItem(actionedKey(review))
    if (!raw) return empty
    const parsed = JSON.parse(raw) as { headSha: string; at: string; commentsPosted?: boolean; approved?: boolean; changesRequested?: boolean }
    if (parsed.headSha !== review.commitSha) return empty
    return {
      commentsPosted: parsed.commentsPosted ?? false,
      approved: parsed.approved ?? false,
      changesRequested: parsed.changesRequested ?? false,
      at: parsed.at,
    }
  } catch {
    return empty
  }
}

export default function PRCard({ review: initialReview }: PRCardProps) {
  const [review, setReview] = useState(initialReview)
  const [positiveOpen, setPositiveOpen] = useState(false)
  const [requestBody, setRequestBody] = useState("")
  const [requestModalOpen, setRequestModalOpen] = useState(false)
  const [approveBody, setApproveBody] = useState("")
  const [approveWithCommentOpen, setApproveWithCommentOpen] = useState(false)
  const [approveDropdownOpen, setApproveDropdownOpen] = useState(false)
  const [posting, setPosting] = useState(false)
  const [approving, setApproving] = useState(false)
  const [exportingMd, setExportingMd] = useState(false)
  const [exportingPdf, setExportingPdf] = useState(false)
  const [actions, setActions] = useState<ActionState>(() => loadActionState(initialReview))
  const { addToast } = useToast()

  const persistActions = (updated: ActionState) => {
    localStorage.setItem(actionedKey(review), JSON.stringify({
      headSha: review.commitSha,
      at: updated.at ?? new Date().toISOString(),
      commentsPosted: updated.commentsPosted,
      approved: updated.approved,
      changesRequested: updated.changesRequested,
    }))
    setActions(updated)
  }

  const toggleIssueSelected = (index: number, selected: boolean) => {
    setReview(r => ({
      ...r,
      issues: r.issues.map((iss, i) => i === index ? { ...iss, selected } : iss),
    }))
  }

  const editIssueComment = (index: number, text: string) => {
    setReview(r => ({
      ...r,
      issues: r.issues.map((iss, i) => i === index ? { ...iss, suggestedComment: text } : iss),
    }))
  }

  const handlePostComments = async () => {
    setPosting(true)
    try {
      const comments: CommentData[] = review.issues
        .filter(iss => iss.selected && iss.file && iss.line)
        .map(iss => ({ path: iss.file!, line: iss.line!, side: "RIGHT", body: iss.suggestedComment }))

      const result = await postInlineComments(review.pr.repo, review.pr.number, comments, review.commitSha)
      addToast({ variant: "success", message: `Posted ${result.posted} comment(s).` })
      if (result.failed > 0) addToast({ variant: "error", message: `${result.failed} failed.` })
      persistActions({ ...actions, commentsPosted: true, at: actions.at ?? new Date().toISOString() })
    } catch (e) {
      addToast({ variant: "error", message: String(e) })
    } finally {
      setPosting(false)
    }
  }

  const handleApprove = async (body?: string) => {
    setApproving(true)
    try {
      if (body && body.trim()) {
        await approvePrWithBody(review.pr.repo, review.pr.number, body.trim())
      } else {
        await approvePr(review.pr.repo, review.pr.number)
      }
      addToast({ variant: "success", message: `Approved #${review.pr.number}.` })
      persistActions({ ...actions, approved: true, at: new Date().toISOString() })
      setApproveWithCommentOpen(false)
      setApproveBody("")
    } catch (e) {
      addToast({ variant: "error", message: String(e) })
    } finally {
      setApproving(false)
    }
  }

  const handleRequestChanges = async () => {
    try {
      await requestChanges(review.pr.repo, review.pr.number, requestBody)
      addToast({ variant: "success", message: `Requested changes on #${review.pr.number}.` })
      setRequestModalOpen(false)
      persistActions({ ...actions, changesRequested: true, at: new Date().toISOString() })
    } catch (e) {
      addToast({ variant: "error", message: String(e) })
    }
  }

  const selectedCount = review.issues.filter(i => i.selected).length

  const handleExportMd = async () => {
    setExportingMd(true)
    const md = prReviewToMarkdown(review)
    const filename = `difforbit-pr-${review.pr.number}-${review.pr.repo.replace("/", "-")}.md`
    try {
      await saveMarkdown(filename, md)
      addToast({ variant: "success", message: `Saved ${filename} to Downloads` })
    } catch (e) {
      addToast({ variant: "error", message: String(e) })
    } finally {
      setExportingMd(false)
    }
  }

  const handleExportPdf = async () => {
    setExportingPdf(true)
    try {
      await printAsPdf()
    } finally {
      setExportingPdf(false)
    }
  }

  const titleStyle: React.CSSProperties = {
    fontFamily: "var(--font-display, 'Inter', system-ui, sans-serif)",
    fontSize: "14px",
    fontWeight: "500",
    color: colors.text.primary,
    textShadow: textGlow.greenSoft,
  }

  const metaStyle: React.CSSProperties = {
    fontFamily: "var(--font-body, system-ui, sans-serif)",
    fontSize: "12px",
    color: colors.text.tertiary,
  }

  return (
    <Panel style={{ marginBottom: space["4"], padding: space["4"] }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: space["3"] }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: space["3"], marginBottom: space["1"] }}>
            <span style={{ ...metaStyle, color: colors.text.ghost }}>#{review.pr.number}</span>
            <span style={titleStyle}>{review.pr.title}</span>
          </div>
          <div style={{ display: "flex", gap: space["3"], alignItems: "center" }}>
            <span style={metaStyle}>{review.pr.repo}</span>
            <span style={metaStyle}>{review.pr.author}</span>
            <VerdictBadge verdict={review.verdict as "APPROVE" | "REQUEST_CHANGES" | "NEEDS_DISCUSSION"} />
          </div>
        </div>
        <a
          href={review.pr.url}
          target="_blank"
          rel="noreferrer"
          style={{ fontFamily: "var(--font-body, system-ui, sans-serif)", fontSize: "12px", color: colors.status.ahead, textDecoration: "none" }}
        >
          Open on GitHub
        </a>
      </div>

      {/* Summary */}
      <div style={{ fontFamily: "var(--font-body, system-ui, sans-serif)", fontSize: "13px", color: colors.text.secondary, marginBottom: space["3"], lineHeight: "1.6" }}>
        {review.summary}
      </div>

      {/* Positive notes */}
      {review.positiveNotes.length > 0 && (
        <div style={{ marginBottom: space["3"] }}>
          <button
            onClick={() => setPositiveOpen(v => !v)}
            style={{ fontFamily: "var(--font-body, system-ui, sans-serif)", fontSize: "12px", color: colors.status.synced, background: "none", border: "none", cursor: "pointer", padding: 0, textDecoration: "underline" }}
          >
            {positiveOpen ? "Hide" : "Show"} {review.positiveNotes.length} positive note{review.positiveNotes.length !== 1 ? "s" : ""}
          </button>
          {positiveOpen && (
            <ul style={{ marginTop: space["2"], paddingLeft: space["4"], listStyle: "disc" }}>
              {review.positiveNotes.map((note, i) => (
                <li key={i} style={{ fontFamily: "var(--font-body, system-ui, sans-serif)", fontSize: "13px", color: colors.status.synced, marginBottom: space["1"] }}>{note}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Issues */}
      {review.issues.length > 0 && (
        <div style={{ marginBottom: space["3"] }}>
          <div style={{ fontFamily: "var(--font-body, system-ui, sans-serif)", fontSize: "12px", color: colors.text.tertiary, marginBottom: space["2"] }}>
            {review.issues.length} issue{review.issues.length !== 1 ? "s" : ""} &mdash; {selectedCount} selected for posting
          </div>
          {review.issues.map((issue, i) => (
            <IssueCard key={i} issue={issue} index={i} onToggleSelected={toggleIssueSelected} onEditComment={editIssueComment} />
          ))}
        </div>
      )}

      {/* Action bar */}
      <div style={{ display: "flex", gap: space["2"], borderTop: `1px solid ${colors.border.default}`, paddingTop: space["3"], flexWrap: "wrap" as const, alignItems: "center" }}>
        <Button
          variant="primary"
          size="sm"
          onClick={handlePostComments}
          loading={posting}
          {...(actions.commentsPosted || selectedCount === 0 ? { disabled: true } as Record<string, boolean> : {})}
        >
          {actions.commentsPosted ? "Comments posted" : `Post ${selectedCount} comment${selectedCount !== 1 ? "s" : ""}`}
        </Button>

        {/* Approve split button */}
        <div style={{ position: "relative", display: "flex" }}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleApprove()}
            loading={approving}
            {...(actions.approved ? { disabled: true } as Record<string, boolean> : {})}
            style={{ borderRadius: "4px 0 0 4px", borderRight: "none" }}
          >
            {actions.approved ? "Approved ✓" : "Approve"}
          </Button>
          {!actions.approved && (
            <button
              onClick={() => setApproveDropdownOpen(v => !v)}
              style={{
                fontFamily: "var(--font-body, system-ui, sans-serif)",
                fontSize: "11px",
                padding: `3px ${space["1"]}`,
                background: "none",
                border: `1px solid ${colors.border.default}`,
                borderLeft: "none",
                borderRadius: "0 4px 4px 0",
                color: colors.text.tertiary,
                cursor: "pointer",
              }}
            >
              ▾
            </button>
          )}
          {approveDropdownOpen && (
            <div
              style={{
                position: "absolute",
                top: "100%",
                left: 0,
                zIndex: 50,
                background: colors.bg.elevated,
                border: `1px solid ${colors.border.default}`,
                borderRadius: "4px",
                minWidth: "160px",
                marginTop: "2px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
              }}
            >
              <button
                onClick={() => { setApproveDropdownOpen(false); setApproveWithCommentOpen(true) }}
                style={{
                  display: "block", width: "100%", textAlign: "left",
                  fontFamily: "var(--font-body, system-ui, sans-serif)", fontSize: "12px",
                  color: colors.text.secondary, background: "none", border: "none",
                  padding: `${space["2"]} ${space["3"]}`, cursor: "pointer",
                }}
              >
                Approve with comment…
              </button>
            </div>
          )}
        </div>

        <Button
          variant="danger"
          size="sm"
          onClick={() => setRequestModalOpen(true)}
          {...(actions.changesRequested ? { disabled: true } as Record<string, boolean> : {})}
        >
          {actions.changesRequested ? "Changes requested ✓" : "Request changes"}
        </Button>

        <div style={{ marginLeft: "auto", display: "flex", gap: space["2"] }}>
          <Button variant="ghost" size="sm" onClick={() => triggerForceRun().catch(() => {})}>
            Re-review
          </Button>
          <Button variant="ghost" size="sm" onClick={handleExportMd} loading={exportingMd}>Export MD</Button>
          <Button variant="ghost" size="sm" onClick={handleExportPdf} loading={exportingPdf}>Export PDF</Button>
        </div>
      </div>
      {actions.at && (
        <div style={{
          marginTop: space["2"],
          fontFamily: "var(--font-body, system-ui, sans-serif)",
          fontSize: "11px",
          color: colors.text.ghost,
        }}>
          Last action on {new Date(actions.at).toLocaleString()}
        </div>
      )}

      {/* Request changes modal */}
      <Modal open={requestModalOpen} onClose={() => setRequestModalOpen(false)} title="Request Changes" size="sm">
        <textarea
          value={requestBody}
          onChange={e => setRequestBody(e.target.value)}
          placeholder="Describe the changes needed..."
          rows={5}
          style={{
            width: "100%",
            fontFamily: "var(--font-body, system-ui, sans-serif)",
            fontSize: "13px",
            backgroundColor: colors.bg.surface,
            color: colors.text.secondary,
            border: `1px solid ${colors.border.default}`,
            borderRadius: "4px",
            padding: space["2"],
            resize: "vertical",
            boxSizing: "border-box",
            marginBottom: space["3"],
          }}
        />
        <div style={{ display: "flex", gap: space["2"] }}>
          <Button variant="danger" onClick={handleRequestChanges}>Submit</Button>
          <Button variant="ghost" onClick={() => setRequestModalOpen(false)}>Cancel</Button>
        </div>
      </Modal>

      {/* Approve with comment modal */}
      <Modal open={approveWithCommentOpen} onClose={() => setApproveWithCommentOpen(false)} title="Approve with Comment" size="sm">
        <textarea
          value={approveBody}
          onChange={e => setApproveBody(e.target.value)}
          placeholder="Optional approval comment..."
          rows={4}
          style={{
            width: "100%",
            fontFamily: "var(--font-body, system-ui, sans-serif)",
            fontSize: "13px",
            backgroundColor: colors.bg.surface,
            color: colors.text.secondary,
            border: `1px solid ${colors.border.default}`,
            borderRadius: "4px",
            padding: space["2"],
            resize: "vertical",
            boxSizing: "border-box",
            marginBottom: space["3"],
          }}
        />
        <div style={{ display: "flex", gap: space["2"] }}>
          <Button variant="primary" onClick={() => handleApprove(approveBody)} loading={approving}>Approve</Button>
          <Button variant="ghost" onClick={() => setApproveWithCommentOpen(false)}>Cancel</Button>
        </div>
      </Modal>
    </Panel>
  )
}
