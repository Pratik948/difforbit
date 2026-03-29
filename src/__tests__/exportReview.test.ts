import { describe, it, expect } from "vitest"
import { prReviewToMarkdown, reportToMarkdown } from "@/utils/exportReview"
import type { PRReview, Report } from "@/types/review"
import type { PullRequest } from "@/types/pr"

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makePR(overrides: Partial<PullRequest> = {}): PullRequest {
  return {
    number: 42,
    title: "Add dark mode support",
    author: "alice",
    url: "https://github.com/org/repo/pull/42",
    repo: "org/repo",
    updatedAt: "2026-03-29T10:00:00Z",
    diff: "diff --git a/main.dart ...",
    files: ["lib/main.dart"],
    headSha: "abc123",
    ...overrides,
  }
}

function makeReview(overrides: Partial<PRReview> = {}): PRReview {
  return {
    pr: makePR(),
    verdict: "REQUEST_CHANGES",
    summary: "This PR has a few issues that need addressing.",
    issues: [
      {
        file: "lib/main.dart",
        line: 10,
        description: "Potential null pointer dereference.",
        severity: "High",
        category: "Stability",
        suggestedComment: "Consider adding a null check here.",
        selected: true,
      },
      {
        file: null,
        line: null,
        description: "Missing documentation.",
        severity: "Low",
        category: "Best Practices",
        suggestedComment: "Please add dartdoc comments.",
        selected: false,
      },
    ],
    positiveNotes: ["Good test coverage.", "Clean structure."],
    overallNotes: "Mostly good, fix the null safety issue.",
    reviewedAt: "2026-03-29T10:05:00Z",
    engine: "claude_code/claude-sonnet-4-6",
    diffMap: {},
    commitSha: "abc123",
    ...overrides,
  }
}

// ── prReviewToMarkdown ────────────────────────────────────────────────────────

describe("prReviewToMarkdown", () => {
  it("includes the PR number and title in the header", () => {
    const md = prReviewToMarkdown(makeReview())
    expect(md).toContain("PR #42")
    expect(md).toContain("Add dark mode support")
  })

  it("includes the verdict", () => {
    const md = prReviewToMarkdown(makeReview())
    expect(md).toContain("REQUEST_CHANGES")
  })

  it("includes the repository name", () => {
    const md = prReviewToMarkdown(makeReview())
    expect(md).toContain("org/repo")
  })

  it("includes the summary paragraph", () => {
    const md = prReviewToMarkdown(makeReview())
    expect(md).toContain("This PR has a few issues that need addressing.")
  })

  it("includes all issues with severity and category", () => {
    const md = prReviewToMarkdown(makeReview())
    expect(md).toContain("[High]")
    expect(md).toContain("Stability")
    expect(md).toContain("Potential null pointer dereference.")
    expect(md).toContain("[Low]")
    expect(md).toContain("Best Practices")
  })

  it("includes file and line for located issues", () => {
    const md = prReviewToMarkdown(makeReview())
    expect(md).toContain("lib/main.dart")
    expect(md).toContain(":10")
  })

  it("falls back to 'general' for issues without file", () => {
    const md = prReviewToMarkdown(makeReview())
    expect(md).toContain("general")
  })

  it("includes suggested comments", () => {
    const md = prReviewToMarkdown(makeReview())
    expect(md).toContain("Consider adding a null check here.")
    expect(md).toContain("Please add dartdoc comments.")
  })

  it("includes positive notes when present", () => {
    const md = prReviewToMarkdown(makeReview())
    expect(md).toContain("Good test coverage.")
    expect(md).toContain("Clean structure.")
  })

  it("includes overall notes", () => {
    const md = prReviewToMarkdown(makeReview())
    expect(md).toContain("Mostly good, fix the null safety issue.")
  })

  it("omits positive notes section when empty", () => {
    const md = prReviewToMarkdown(makeReview({ positiveNotes: [] }))
    expect(md).not.toContain("Positive Notes")
  })

  it("omits issues section when empty", () => {
    const md = prReviewToMarkdown(makeReview({ issues: [] }))
    expect(md).not.toContain("Issues (")
  })

  it("omits overall notes section when empty string", () => {
    const md = prReviewToMarkdown(makeReview({ overallNotes: "" }))
    expect(md).not.toContain("Overall Notes")
  })

  it("produces valid markdown with correct heading levels", () => {
    const md = prReviewToMarkdown(makeReview())
    expect(md).toMatch(/^# DiffOrbit Review/m)
    expect(md).toMatch(/^## PR #42/m)
    expect(md).toMatch(/^### Summary/m)
    expect(md).toMatch(/^### Issues/m)
  })

  it("returns a string", () => {
    expect(typeof prReviewToMarkdown(makeReview())).toBe("string")
  })
})

// ── reportToMarkdown ──────────────────────────────────────────────────────────

describe("reportToMarkdown", () => {
  const report: Report = {
    id: "report-1",
    runAt: "2026-03-29T10:00:00Z",
    engine: "claude_code/claude-sonnet-4-6",
    reviews: [makeReview(), makeReview({ pr: makePR({ number: 99, title: "Fix typo" }), verdict: "APPROVE" })],
  }

  it("includes the report header", () => {
    const md = reportToMarkdown(report)
    expect(md).toContain("DiffOrbit Review Report")
  })

  it("includes PR count", () => {
    const md = reportToMarkdown(report)
    expect(md).toContain("2")
  })

  it("includes all PRs", () => {
    const md = reportToMarkdown(report)
    expect(md).toContain("PR #42")
    expect(md).toContain("PR #99")
    expect(md).toContain("Fix typo")
  })

  it("includes both verdicts", () => {
    const md = reportToMarkdown(report)
    expect(md).toContain("REQUEST_CHANGES")
    expect(md).toContain("APPROVE")
  })
})
