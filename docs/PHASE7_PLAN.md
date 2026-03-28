# DiffOrbit — Phase 7: Feature Expansion Plan

> Approved by user on 2026-03-28. Implementation tracked in `.phase-tracker/state.json`.

---

## Features

### Phase A — Rust / Backend

| ID | Feature | Status |
|----|---------|--------|
| A1 | macOS notifications via `tauri-plugin-notification` | pending |
| A2 | Parallel PR review (concurrency = 3, tokio JoinSet + Semaphore) | pending |
| A3 | Large diff truncation (60K char budget, per-file, warning event) | pending |
| A4 | Re-review changed files (extend seen.json with headSha + files hash) | pending |

### Phase B — Frontend: New Components

| ID | Feature | Status |
|----|---------|--------|
| B1 | Onboarding wizard — 6-step first-run modal | pending |
| B2 | Keyboard shortcuts hook + ShortcutsHelpModal | pending |
| B3 | Search & filter bar on Reports page | pending |
| B4 | Export review as Markdown + PDF | pending |

### Phase C — UX Polish

| ID | Feature | Status |
|----|---------|--------|
| C1 | Empty states (Dashboard + Reports) | pending |
| C2 | Re-review changed files button on PRCard | pending |
| C3 | Notification permission banner (first run) | pending |

---

## Onboarding Wizard Steps

| Step | Content |
|------|---------|
| 1 · Welcome | What DiffOrbit is, how the review pipeline works |
| 2 · How reviews work | Verdicts, severity levels, suggested comments explained |
| 3 · GitHub setup | Inline `check_gh_auth` — green tick or link to `gh auth login` |
| 4 · AI Engine | Pick engine, enter API key or confirm Claude Code CLI |
| 5 · Add first repo | Inline repo form + profile picker |
| 6 · Tour & Shortcuts | Keyboard shortcuts, 8 built-in profiles, schedule tip |

---

## Keyboard Shortcuts Reference

| Key | Action |
|-----|--------|
| `j / k` | Navigate between PRCards |
| `i` | Expand/collapse focused IssueCard |
| `a` | Approve focused PR |
| `r` | Request changes on focused PR |
| `p` | Post selected comments |
| `Space` | Toggle expand/collapse focused card |
| `/` | Focus search bar |
| `Esc` | Close modal / collapse |
| `Cmd+R` | Trigger Run Now |
| `?` | Open shortcuts help modal |

---

## Key Architectural Decisions

- **Parallel review**: max concurrency 3 via `tokio::sync::Semaphore`; progress events still emitted per-PR
- **Diff truncation**: per-file budget inside 60K total; appends truncation notice to prompt
- **Re-review detection**: compare `headSha` first (fast); if changed, diff file list and filter diff to changed files only
- **PDF export**: uses `window.print()` with `@media print` CSS — no extra library
- **Onboarding**: stored as `onboardingComplete: bool` in `AppConfig`; wizard also accessible via `?` help icon
- **Keyboard nav**: disabled when any `<input>` / `<textarea>` / modal is focused
