export interface DiffLine {
  type: "add" | "remove" | "context" | "hunk"
  line: number | null
  text: string
}

export interface ReviewIssue {
  file: string | null
  line: number | null
  description: string
  severity: "High" | "Medium" | "Low" | "NEEDS_VERIFICATION"
  category: "Code Quality" | "Logic" | "Stability" | "Performance" | "Security" | "Best Practices"
  suggestedComment: string
  selected: boolean
  diffHunk?: DiffLine[]
}

export interface PRReview {
  pr: import("./pr").PullRequest
  verdict: "APPROVE" | "REQUEST_CHANGES" | "NEEDS_DISCUSSION"
  summary: string
  issues: ReviewIssue[]
  positiveNotes: string[]
  overallNotes: string
  reviewedAt: string
  engine: string
  diffMap: Record<string, Record<number, number>>
  commitSha: string
}

export interface ReportMeta {
  id: string
  runAt: string
  prCount: number
  engine: string
}

export interface Report {
  id: string
  runAt: string
  reviews: PRReview[]
  engine: string
}
