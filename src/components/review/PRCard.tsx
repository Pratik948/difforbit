import React, { useState } from "react"
import { colors, space, textGlow } from "@matrixui/tokens"
import { Panel, Button, Modal, useToast } from "@matrixui/react"
import type { PRReview } from "@/types/review"
import VerdictBadge from "./VerdictBadge"
import IssueCard from "./IssueCard"
import { postInlineComments, approvePr, requestChanges } from "@/ipc/github"
import type { CommentData } from "@/ipc/github"
import { triggerReviewChangedFiles } from "@/ipc/review"
import { prReviewToMarkdown, saveMarkdown, printAsPdf } from "@/utils/exportReview"

interface PRCardProps {
  review: PRReview
}

export default function PRCard({ review: initialReview }: PRCardProps) {
  const [review, setReview] = useState(initialReview)
  const [positiveOpen, setPositiveOpen] = useState(false)
  const [requestBody, setRequestBody] = useState("")
  const [requestModalOpen, setRequestModalOpen] = useState(false)
  const [posting, setPosting] = useState(false)
  const [approving, setApproving] = useState(false)
  const [actioned, setActioned] = useState(false)
  const { addToast } = useToast()

  const toggleIssueSelected = (index: number, selected: boolean) => {
    setReview(r => ({
      ...r,
      issues: r.issues.map((iss, i) => i === index ? { ...iss, selected } : iss),
    }))
  }

  const handlePostComments = async () => {
    setPosting(true)
    try {
      const comments: CommentData[] = review.issues
        .filter(iss => iss.selected && iss.file && iss.line)
        .map(iss => {
          const position = review.diffMap[iss.file!]?.[iss.line!] ?? 1
          return {
            path: iss.file!,
            position,
            body: iss.suggestedComment,
          }
        })

      const result = await postInlineComments(
        review.pr.repo,
        review.pr.number,
        comments,
        review.commitSha,
      )
      addToast({ variant: "success", message: `Posted ${result.posted} comment(s).` })
      if (result.failed > 0) addToast({ variant: "error", message: `${result.failed} failed.` })
      setActioned(true)
    } catch (e) {
      addToast({ variant: "error", message: String(e) })
    } finally {
      setPosting(false)
    }
  }

  const handleApprove = async () => {
    setApproving(true)
    try {
      await approvePr(review.pr.repo, review.pr.number)
      addToast({ variant: "success", message: `Approved #${review.pr.number}.` })
      setActioned(true)
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
      setActioned(true)
    } catch (e) {
      addToast({ variant: "error", message: String(e) })
    }
  }

  const selectedCount = review.issues.filter(i => i.selected).length

  const handleExportMd = async () => {
    const md = prReviewToMarkdown(review)
    const filename = `difforbit-pr-${review.pr.number}-${review.pr.repo.replace("/", "-")}.md`
    try {
      await saveMarkdown(filename, md)
      addToast({ variant: "success", message: `Saved ${filename} to Downloads` })
    } catch (e) {
      addToast({ variant: "error", message: String(e) })
    }
  }

  const titleStyle: React.CSSProperties = {
    fontFamily: "var(--font-display, 'Share Tech Mono', monospace)",
    fontSize: "14px",
    color: colors.text.primary,
    textShadow: textGlow.greenSoft,
  }

  const metaStyle: React.CSSProperties = {
    fontFamily: "var(--font-body, monospace)",
    fontSize: "11px",
    color: colors.text.tertiary,
  }

  return (
    <Panel rain={{ preset: "diff" }} style={{ marginBottom: space['4'], padding: space['4'] }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: space['3'] }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: space['3'], marginBottom: space['1'] }}>
            <span style={{ ...metaStyle, color: colors.text.ghost }}>#{review.pr.number}</span>
            <span style={titleStyle}>{review.pr.title}</span>
          </div>
          <div style={{ display: "flex", gap: space['3'], alignItems: "center" }}>
            <span style={metaStyle}>{review.pr.repo}</span>
            <span style={metaStyle}>@{review.pr.author}</span>
            <VerdictBadge verdict={review.verdict as "APPROVE" | "REQUEST_CHANGES" | "NEEDS_DISCUSSION"} />
          </div>
        </div>
        <a
          href={review.pr.url}
          target="_blank"
          rel="noreferrer"
          style={{ fontFamily: "var(--font-body, monospace)", fontSize: "10px", color: colors.status.ahead, textDecoration: "none" }}
        >
          ↗ GitHub
        </a>
      </div>

      {/* Summary */}
      <div style={{ fontFamily: "var(--font-body, monospace)", fontSize: "12px", color: colors.text.secondary, marginBottom: space['3'], lineHeight: "1.6" }}>
        {review.summary}
      </div>

      {/* Positive notes */}
      {review.positiveNotes.length > 0 && (
        <div style={{ marginBottom: space['3'] }}>
          <button
            onClick={() => setPositiveOpen(v => !v)}
            style={{ fontFamily: "var(--font-body, monospace)", fontSize: "11px", color: colors.status.synced, background: "none", border: "none", cursor: "pointer", padding: 0 }}
          >
            {positiveOpen ? "▼" : "▶"} {review.positiveNotes.length} positive note(s)
          </button>
          {positiveOpen && (
            <ul style={{ marginTop: space['2'], paddingLeft: space['4'], listStyle: "disc" }}>
              {review.positiveNotes.map((note, i) => (
                <li key={i} style={{ fontFamily: "var(--font-body, monospace)", fontSize: "11px", color: colors.status.synced, marginBottom: space['1'] }}>{note}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Issues */}
      {review.issues.length > 0 && (
        <div style={{ marginBottom: space['3'] }}>
          <div style={{ fontFamily: "var(--font-body, monospace)", fontSize: "11px", color: colors.text.tertiary, marginBottom: space['2'] }}>
            {review.issues.length} issue(s) — {selectedCount} selected for posting
          </div>
          {review.issues.map((issue, i) => (
            <IssueCard
              key={i}
              issue={issue}
              index={i}
              onToggleSelected={toggleIssueSelected}
            />
          ))}
        </div>
      )}

      {/* Action bar */}
      <div style={{ display: "flex", gap: space['2'], borderTop: `1px solid ${colors.border.default}`, paddingTop: space['3'] }}>
        <Button
          variant="primary"
          size="sm"
          onClick={handlePostComments}
          loading={posting}
          {...(actioned || selectedCount === 0 ? { disabled: true } as Record<string, boolean> : {})}
        >
          Post {selectedCount} Comment{selectedCount !== 1 ? "s" : ""}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleApprove}
          loading={approving}
          {...(actioned ? { disabled: true } as Record<string, boolean> : {})}
        >
          Approve
        </Button>
        <Button
          variant="danger"
          size="sm"
          onClick={() => setRequestModalOpen(true)}
          {...(actioned ? { disabled: true } as Record<string, boolean> : {})}
        >
          Request Changes
        </Button>
        <div style={{ marginLeft: "auto", display: "flex", gap: space['2'] }}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => triggerReviewChangedFiles().catch(() => {})}
          >
            ↻ Changed files
          </Button>
          <Button variant="ghost" size="sm" onClick={handleExportMd}>
            ↓ MD
          </Button>
          <Button variant="ghost" size="sm" onClick={printAsPdf}>
            ↓ PDF
          </Button>
        </div>
      </div>

      {/* Request changes modal */}
      <Modal open={requestModalOpen} onClose={() => setRequestModalOpen(false)} title="Request Changes" size="sm">
        <textarea
          value={requestBody}
          onChange={e => setRequestBody(e.target.value)}
          placeholder="Describe the changes needed..."
          rows={5}
          style={{
            width: "100%",
            fontFamily: "var(--font-body, monospace)",
            fontSize: "12px",
            backgroundColor: colors.bg.surface,
            color: colors.text.secondary,
            border: `1px solid ${colors.border.default}`,
            padding: space['2'],
            resize: "vertical",
            boxSizing: "border-box",
            marginBottom: space['3'],
          }}
        />
        <div style={{ display: "flex", gap: space['2'] }}>
          <Button variant="danger" onClick={handleRequestChanges}>Submit</Button>
          <Button variant="ghost" onClick={() => setRequestModalOpen(false)}>Cancel</Button>
        </div>
      </Modal>
    </Panel>
  )
}
