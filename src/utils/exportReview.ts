import type { Report, PRReview } from "@/types/review"

// ── Markdown generation ──────────────────────────────────────────────────────

function reviewToMarkdown(review: PRReview): string {
  const lines: string[] = []

  lines.push(`## PR #${review.pr.number} — ${review.pr.title}`)
  lines.push(``)
  lines.push(`| Field | Value |`)
  lines.push(`|-------|-------|`)
  lines.push(`| Repository | \`${review.pr.repo}\` |`)
  lines.push(`| Author | ${review.pr.author} |`)
  lines.push(`| Verdict | **${review.verdict}** |`)
  lines.push(`| Reviewed at | ${review.reviewedAt} |`)
  lines.push(`| Engine | \`${review.engine}\` |`)
  lines.push(``)
  lines.push(`### Summary`)
  lines.push(``)
  lines.push(review.summary)
  lines.push(``)

  if (review.positiveNotes.length > 0) {
    lines.push(`### Positive Notes`)
    lines.push(``)
    review.positiveNotes.forEach(n => lines.push(`- ${n}`))
    lines.push(``)
  }

  if (review.issues.length > 0) {
    lines.push(`### Issues (${review.issues.length})`)
    lines.push(``)
    review.issues.forEach((issue, i) => {
      const loc = issue.file ? `\`${issue.file}\`${issue.line ? `:${issue.line}` : ""}` : "general"
      lines.push(`#### ${i + 1}. [${issue.severity}] ${issue.category} — ${loc}`)
      lines.push(``)
      lines.push(issue.description)
      lines.push(``)
      if (issue.suggestedComment) {
        lines.push(`> **Suggested comment:**`)
        lines.push(`> ${issue.suggestedComment}`)
        lines.push(``)
      }
    })
  }

  if (review.overallNotes) {
    lines.push(`### Overall Notes`)
    lines.push(``)
    lines.push(review.overallNotes)
    lines.push(``)
  }

  return lines.join("\n")
}

export function reportToMarkdown(report: Report): string {
  const lines: string[] = []
  lines.push(`# DiffOrbit Review Report`)
  lines.push(``)
  lines.push(`| Field | Value |`)
  lines.push(`|-------|-------|`)
  lines.push(`| Run at | ${report.runAt} |`)
  lines.push(`| PRs reviewed | ${report.reviews.length} |`)
  lines.push(`| Engine | \`${report.engine}\` |`)
  lines.push(``)
  lines.push(`---`)
  lines.push(``)
  report.reviews.forEach(r => {
    lines.push(reviewToMarkdown(r))
    lines.push(`---`)
    lines.push(``)
  })
  return lines.join("\n")
}

export function prReviewToMarkdown(review: PRReview): string {
  return `# DiffOrbit Review — PR #${review.pr.number}\n\n${reviewToMarkdown(review)}`
}

// ── Save markdown to Downloads ───────────────────────────────────────────────

export async function saveMarkdown(filename: string, content: string): Promise<void> {
  const blob = new Blob([content], { type: "text/markdown" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// ── PDF via window.print() ───────────────────────────────────────────────────

export function printAsPdf(): void {
  window.print()
}
