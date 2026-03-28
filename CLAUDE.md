# DiffOrbit — CLAUDE.md

> **AI-powered PR code review desktop app for macOS**
> Tauri + Rust backend · React + TypeScript frontend · shadcn/ui + Tailwind CSS

---

## How to use this file

This is the authoritative build plan for Claude Code. At the **start of every session**:

1. Read this file top to bottom
2. Check `.phase-tracker/state.json` for current progress (create it if missing, initialise from phases below)
3. Print a **Session Resume** summary (see phase-tracker skill format)
4. Ask which phase/task to continue from, or proceed automatically if context is clear

After completing any task or phase, **update `.phase-tracker/state.json` immediately**.

---

## Project Overview

DiffOrbit is a macOS menu-bar + full-window desktop app that:
- Polls GitHub for PRs where the user is a requested reviewer
- Sends each diff to an AI model (Anthropic API / OpenAI-compatible / Claude Code CLI) for structured review
- Displays results in a rich UI with inline diff viewing and Matrix digital rain aesthetic
- Lets the user approve / post inline comments / request changes — all without leaving the app

**Stack:** Tauri 2 · Rust (thin shell-out layer) · React 18 + TypeScript + Vite · Tailwind CSS · Zustand · npm

---

## Design System

DiffOrbit uses **shadcn/ui** components with a custom `--do-*` CSS variable token layer defined in `src/styles/themes.ts`. Three built-in themes are available: `matrix` (dark green terminal), `shadcn-dark`, and `shadcn-light`. The active theme is persisted to `localStorage` under the key `difforbit-theme`.

### Token Layer (`src/styles/tokens.ts`)

All components import from `@/styles/tokens` which returns `var(--do-*)` references. Switching themes calls `applyTheme(id)` which sets all `--do-*` properties on `:root`.

Key tokens: `--do-bg-base`, `--do-bg-surface`, `--do-bg-elevated`, `--do-text-primary/secondary/tertiary`, `--do-border`, `--do-accent`, `--do-danger`, `--do-warning`, `--do-success`, `--do-diff-added-bg`, `--do-diff-removed-bg`

### shadcn CSS var bridge (`src/App.css`)

Standard shadcn vars (`--background`, `--foreground`, `--border`, etc.) are mapped to `var(--do-*)` tokens so shadcn components automatically pick up theme changes.

---

## Project File Structure (target)

```
difforbit/
├── CLAUDE.md                         ← this file
├── .phase-tracker/
│   └── state.json                    ← phase tracker state (gitignored)
├── .gitignore
├── package.json
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
│
├── src-tauri/                        ← Rust backend
│   ├── Cargo.toml
│   └── src/
│       ├── main.rs                   ← app entry, system tray
│       ├── commands/
│       │   ├── mod.rs
│       │   ├── github.rs             ← gh CLI calls
│       │   ├── review.rs             ← orchestrates a review run
│       │   ├── engines.rs            ← Anthropic / OpenAI-compat / ClaudeCode dispatch
│       │   ├── scheduler.rs          ← cron scheduling
│       │   ├── config.rs             ← read/write config.json
│       │   └── keychain.rs           ← macOS Keychain via security-framework
│       ├── models/
│       │   ├── pr.rs
│       │   ├── review.rs
│       │   ├── config.rs
│       │   └── engine.rs
│       └── diff/
│           ├── parser.rs             ← unified diff → position map
│           └── extractor.rs          ← hunk extraction for file + line
│
└── src/                              ← React + TypeScript frontend
    ├── main.tsx
    ├── App.tsx
    ├── styles/
    │   ├── themes.ts                 ← --do-* CSS variable definitions for all 3 themes
    │   └── tokens.ts                 ← CSS var reference exports (drop-in for components)
    ├── pages/
    │   ├── Dashboard.tsx
    │   ├── Reports.tsx
    │   ├── ReportViewer.tsx
    │   ├── Configuration.tsx
    │   └── Profiles.tsx
    ├── components/
    │   ├── layout/
    │   │   ├── Sidebar.tsx
    │   │   ├── TrayPopover.tsx
    │   │   └── WindowFrame.tsx
    │   ├── review/
    │   │   ├── PRCard.tsx
    │   │   ├── IssueCard.tsx
    │   │   ├── DiffViewer.tsx
    │   │   ├── CommentToggle.tsx
    │   │   └── VerdictBadge.tsx
    │   ├── config/
    │   │   ├── RepoList.tsx
    │   │   ├── EngineSelector.tsx
    │   │   ├── SchedulePicker.tsx
    │   │   ├── ApiKeyInput.tsx
    │   │   └── ProfileEditor.tsx
    │   ├── rain/
    │   │   └── MatrixRain.tsx        ← reusable canvas rain component
    │   └── ui/                       ← base MatrixUI primitives
    │       ├── Button.tsx
    │       ├── Toggle.tsx
    │       ├── Input.tsx
    │       ├── Select.tsx
    │       ├── Badge.tsx
    │       └── Card.tsx
    ├── hooks/
    │   ├── useReviews.ts
    │   ├── useConfig.ts
    │   ├── useScheduler.ts
    │   └── useTauriEvents.ts
    ├── store/
    │   ├── index.ts
    │   ├── reviewStore.ts
    │   └── configStore.ts
    ├── ipc/                          ← typed invoke() wrappers
    │   ├── index.ts
    │   ├── github.ts
    │   ├── review.ts
    │   ├── config.ts
    │   └── engines.ts
    └── types/
        ├── pr.ts
        ├── review.ts
        ├── config.ts
        └── engine.ts
```

---

## Data Models (TypeScript — source of truth)

```typescript
// engine.ts
type EngineType = "anthropic" | "openai_compatible" | "claude_code"
interface EngineConfig {
  type: EngineType
  model: string
  baseUrl?: string
  apiKeyRef?: string
  maxTokens: number
  temperature: number
}

// config.ts
interface ReviewProfile {
  id: string
  name: string
  languages: string[]
  extensions: string[]
  systemPrompt: string
  isBuiltIn: boolean
}
interface RepoConfig {
  owner: string
  repo: string
  profileId: string
  enabled: boolean
}
interface ScheduleConfig {
  enabled: boolean
  hour: number
  minute: number
  catchUpOnWake: boolean
}
interface AppConfig {
  githubUsername: string
  repos: RepoConfig[]
  schedule: ScheduleConfig
  engine: EngineConfig
  profiles: ReviewProfile[]
  showDiff: boolean
  diffContext: number
}

// pr.ts
interface PullRequest {
  number: number
  title: string
  author: string
  url: string
  repo: string
  updatedAt: string
  diff: string
  files: string[]
  headSha: string
}

// review.ts
interface ReviewIssue {
  file: string | null
  line: number | null
  description: string
  severity: "High" | "Medium" | "Low" | "NEEDS_VERIFICATION"
  category: "Code Quality" | "Logic" | "Stability" | "Performance" | "Security" | "Best Practices"
  suggestedComment: string
  selected: boolean
  diffHunk?: DiffLine[]
}
interface PRReview {
  pr: PullRequest
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
interface Report {
  id: string
  runAt: string
  reviews: PRReview[]
  engine: string
}
interface DiffLine {
  type: "add" | "remove" | "context" | "hunk"
  line: number | null
  text: string
}
```

---

## Rust IPC Command Surface

```rust
// github.rs
list_pending_prs(repos: Vec<RepoConfig>) -> Result<Vec<PullRequest>>
fetch_pr_diff(repo: String, number: u32) -> Result<String>
post_inline_comments(repo, number, comments, commit_sha) -> Result<PostResult>
approve_pr(repo: String, number: u32) -> Result<()>
request_changes(repo: String, number: u32, body: String) -> Result<()>
check_gh_auth() -> Result<String>

// engines.rs
run_review(pr: PullRequest, profile: ReviewProfile, engine: EngineConfig) -> Result<PRReview>

// config.rs
get_config() -> Result<AppConfig>
save_config(config: AppConfig) -> Result<()>
reset_profile(id: String) -> Result<ReviewProfile>

// keychain.rs
save_api_key(service: String, key: String) -> Result<()>
has_api_key(service: String) -> Result<bool>
delete_api_key(service: String) -> Result<()>
// NOTE: get_api_key is NOT exposed to renderer

// scheduler.rs
get_next_run_time() -> Result<Option<String>>
trigger_run_now() -> Result<()>

// reports
list_reports() -> Result<Vec<ReportMeta>>
load_report(id: String) -> Result<Report>
delete_report(id: String) -> Result<()>
```

### Tauri Events (Rust → Frontend)

```
review:started      { total_prs: number }
review:pr_done      { pr_number: number, verdict: string, issues_count: number }
review:completed    { report_id: string }
review:error        { message: string }
scheduler:tick      { next_run: string }
```

---

## Key Architectural Decisions

| Decision | Reason |
|---|---|
| Tauri not Electron | Smaller binary (~5 MB), native macOS APIs |
| Rust layer is thin | Only shells out to `gh` and `claude`; no complex async Rust |
| OpenAI-compatible engine covers all | One type handles OpenAI, Ollama, Groq, Together, Mistral, any local model |
| API keys in Keychain only | Never written to config.json or logs |
| `get_api_key` NOT exposed to renderer | Rust reads keys internally; renderer only calls `has_api_key` |
| Reports as JSON files | Not a database — simple, inspectable, portable |
| MatrixUI throughout | Matrix rain, monospace, green palette, dark only |

---

## Prerequisites (dev machine)

```bash
# Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Node 20+
node --version

# Tauri CLI
cargo install tauri-cli

# GitHub CLI
brew install gh && gh auth login

# Claude Code CLI (for claude_code engine)
npm install -g @anthropic-ai/claude-code && claude
```

---

## Build Phases

---

### Phase 1 — Foundation & Scaffold

**Goal:** Working Tauri + React app with MatrixUI wired up, sidebar navigation, and a functional Configuration page that persists to disk.

#### 1.1 — Bootstrap Tauri + React project
- Run `npm create tauri-app@latest difforbit -- --template react-ts` (or Tauri v2 equivalent)
- Verify `npm run tauri dev` opens an app window
- Commit initial scaffold

#### 1.2 — Install and configure dependencies
- Install frontend deps: `tailwindcss`, `@tailwindcss/vite`, `zustand`, `react-router-dom`
- Configure `tailwind.config.ts` with content paths covering `src/**/*.{ts,tsx}`
- Configure `vite.config.ts` with path alias `@` → `src/`
- Install Rust crates in `Cargo.toml`: `serde`, `serde_json`, `tauri-plugin-shell`, `tauri-plugin-fs`

#### 1.3 — Clone MatrixUI and extract design tokens
- Clone `https://github.com/Pratik948/matrix-ui.git` into a sibling directory
- Inspect the repo for exported CSS custom properties, Tailwind config extensions, and component source
- Create `src/styles/globals.css` with all MatrixUI CSS custom properties (palette, typography)
- Extend `tailwind.config.ts` to map MatrixUI tokens as Tailwind utilities (e.g. `text-matrix-green`, `bg-matrix-surface`)
- Import `globals.css` in `src/main.tsx`

#### 1.4 — MatrixRain canvas component
- Create `src/components/rain/MatrixRain.tsx` — a `<canvas>` component that:
  - Accepts props: `speed` (ms/frame), `opacity` (0–1), `headColor` (hex string)
  - Renders the falling katakana/binary rain on a transparent canvas
  - Uses `requestAnimationFrame` with the given speed interval
  - Is absolutely positioned, fills its parent, `pointer-events: none`, `z-index: 0`
- Test it renders correctly in isolation

#### 1.5 — Base UI primitives
- Create `src/components/ui/` components using MatrixUI tokens:
  - `Button.tsx` — variants: `primary` (green-100 border + text), `ghost`, `danger`
  - `Input.tsx` — monospace, green border, dark surface background
  - `Select.tsx` — same aesthetic as Input
  - `Toggle.tsx` — green when on, muted when off
  - `Badge.tsx` — severity variants: High (red), Medium (amber), Low (green), NEEDS_VERIFICATION (cyan)
  - `Card.tsx` — dark surface, green border, optional rain background layer
- All components must use CSS custom properties, never hardcoded hex values

#### 1.6 — App layout shell
- Set up `react-router-dom` with `BrowserRouter` (or `MemoryRouter` for Tauri)
- Create `src/App.tsx` as a two-column layout: `<Sidebar>` + `<main>` content area
- Create `src/components/layout/WindowFrame.tsx` — wraps entire app, sets `background: var(--color-base)`, injects the header MatrixRain
- Create `src/components/layout/Sidebar.tsx`:
  - Fixed left column, ~220px wide
  - Surface background (`--color-green-900`) with slow MatrixRain (65ms, 0.38 opacity)
  - Navigation links: Dashboard · Reports · Configuration · Profiles
  - Active link: `--color-green-100` text + left border indicator
  - All text in `--font-body` monospace
- Wire up routes: `/` → Dashboard placeholder, `/reports` → Reports placeholder, `/configuration` → Configuration page, `/profiles` → Profiles placeholder

#### 1.7 — Rust: config command
- In `src-tauri/src/commands/config.rs`, implement:
  - `get_config()` — reads `userData/config.json`; returns `AppConfig` default if file absent
  - `save_config(config: AppConfig)` — serialises and writes to `userData/config.json`
- Define Rust structs in `src-tauri/src/models/config.rs` matching the TypeScript `AppConfig` interface (use `serde::Deserialize / Serialize`)
- Register both commands in `main.rs` via `tauri::generate_handler![]`

#### 1.8 — Configuration page (frontend)
- Create `src/pages/Configuration.tsx` with four sections:

  **GitHub section**
  - Text input: GitHub username (`githubUsername`)
  - `check_gh_auth` status indicator (green "authenticated" / red "not logged in")

  **Repositories section** (`src/components/config/RepoList.tsx`)
  - List of `RepoConfig` rows: `owner/repo`, profile selector, enabled toggle, delete button
  - "Add Repository" button → inline form: owner input, repo input, profile select, confirm

  **AI Engine section** (`src/components/config/EngineSelector.tsx`)
  - Radio/select for engine type: `anthropic` | `openai_compatible` | `claude_code`
  - Conditional fields:
    - anthropic: model input + `ApiKeyInput` component (shows `has_api_key` status, save/delete buttons)
    - openai_compatible: baseUrl input + model input + `ApiKeyInput`
    - claude_code: info label only ("uses authenticated Claude Code CLI session")
  - maxTokens + temperature sliders

  **Schedule section** (`src/components/config/SchedulePicker.tsx`)
  - Enabled toggle
  - Hour + minute pickers (00–23, 00–59)
  - Catch-up-on-wake toggle

- On mount: call `get_config()` via IPC, populate form
- "Save Configuration" button: call `save_config()` via IPC, show success/error toast

#### 1.9 — IPC typed wrappers
- Create `src/ipc/config.ts` with typed wrappers around `invoke('get_config')` and `invoke('save_config', { config })`
- Create `src/store/configStore.ts` (Zustand) with `config`, `loadConfig()`, `saveConfig()` actions
- Create `src/types/` files matching all TypeScript interfaces defined in Data Models section above

#### 1.10 — Menu bar icon + Tray popover
- In `main.rs`: create a `SystemTray` with a custom icon (use a placeholder green dot PNG for now)
- Tray left-click opens a small `TrayPopover` window (300×180px, no decorations):
  - Last run: "Never" (placeholder)
  - Next run: "Not scheduled" (placeholder)
  - "Run Now" button (disabled, wired up in Phase 2)
  - "Open DiffOrbit" → shows/focuses main window
- Window close (`tauri::WindowEvent::CloseRequested`) → `window.hide()` (process stays alive)

#### 1.11 — Phase 1 verification checklist
- `npm run tauri dev` opens app with no console errors
- Sidebar renders with MatrixRain background visible
- All four nav links route correctly
- Configuration page loads, all form sections render with MatrixUI styling
- Saving config writes to `~/Library/Application Support/DiffOrbit/config.json`
- Reloading app rehydrates config form with saved values
- Menu bar icon visible; tray popover opens on click
- Window X button hides to tray, does not quit

---

### Phase 2 — Review Engine

**Goal:** Full end-to-end review run — fetching PRs from GitHub, sending diffs to AI, parsing structured output, emitting real-time progress events to the frontend, and persisting reports to disk.

#### 2.1 — Rust models
- Define all Rust structs in `src-tauri/src/models/`:
  - `pr.rs`: `PullRequest`
  - `review.rs`: `ReviewIssue`, `PRReview`, `Report`, `DiffLine`
  - `engine.rs`: `EngineConfig`, `EngineType`
- All structs must derive `Serialize`, `Deserialize`, `Clone`

#### 2.2 — GitHub CLI integration (`github.rs`)
- Implement `check_gh_auth()` — runs `gh auth status --json user` and returns the username string
- Implement `list_pending_prs(repos)`:
  - For each enabled `RepoConfig`, run: `gh pr list --repo owner/repo --reviewer @me --json number,title,author,url,updatedAt,headRefOid,files --state open`
  - Parse output into `Vec<PullRequest>`
  - Skip PRs present in `seen.json` where `updatedAt` is unchanged (see 2.4)
- Implement `fetch_pr_diff(repo, number)`:
  - Run: `gh pr diff owner/repo --pr number`
  - Return raw unified diff string
- Implement `post_inline_comments(repo, number, comments, commit_sha)`:
  - Batch all comments into a single `POST /repos/{owner}/{repo}/pulls/{number}/reviews` via `gh api`
  - Body: `{ commit_id, event: "COMMENT", comments: [{ path, position, body }] }`
- Implement `approve_pr(repo, number)` — `gh pr review --approve`
- Implement `request_changes(repo, number, body)` — `gh pr review --request-changes --body`

#### 2.3 — Engine abstraction (`engines.rs`)
- Implement `run_review(pr, profile, engine_config)` that dispatches based on `engine_config.type`:
  
  **Anthropic API path:**
  - Read API key from macOS Keychain using `security-framework` crate (`keychain.rs`)
  - POST to `https://api.anthropic.com/v1/messages` using `reqwest` (blocking or async)
  - Headers: `x-api-key`, `anthropic-version: 2023-06-01`, `content-type: application/json`
  - Body: `{ model, max_tokens, messages: [{ role: "user", content: prompt }] }`
  
  **OpenAI-compatible path:**
  - Same HTTP pattern but to `engine_config.base_url + /chat/completions`
  - Body: `{ model, max_tokens, messages: [{ role: "user", content: prompt }] }`
  
  **Claude Code CLI path:**
  - Shell out: `claude -p "<escaped_prompt>"`
  - Capture stdout
  
- All three paths feed output to `extract_json(raw_output)`:
  - Find first `{` in output, extract from there to matching `}`
  - Parse into `PRReview` struct
  - Map `suggested_comment` → `suggestedComment`, snake_case → camelCase as needed

#### 2.4 — Seen-PR cache
- Location: `userData/seen.json`
- Schema: `{ "owner/repo": { "42": { "reviewed_at": "...", "updated_at": "..." } } }`
- Read on every run before fetching diffs
- Write after a successful review (not on failure — failures must retry)
- "Re-review all" bypass: accept a `force: bool` param in `run_review` command

#### 2.5 — Review prompt construction
- In `engines.rs`, assemble the prompt from:
  - `profile.system_prompt` (the reviewer persona + rules)
  - PR metadata: title, author, repo, file list
  - The raw diff text
  - Instruction to return **raw JSON only** (no markdown fences) with this exact schema:
    ```json
    {
      "verdict": "APPROVE | REQUEST_CHANGES | NEEDS_DISCUSSION",
      "summary": "2-3 sentence summary",
      "issues": [{
        "file": "exact path or null",
        "line": 123,
        "description": "...",
        "severity": "High | Medium | Low | NEEDS_VERIFICATION",
        "category": "Code Quality | Logic | Stability | Performance | Security | Best Practices",
        "suggested_comment": "..."
      }],
      "positive_notes": ["..."],
      "overall_notes": "..."
    }
    ```

#### 2.6 — Review orchestrator (`review.rs`)
- Implement the `run_review_session` Tauri command:
  1. Emit `review:started { total_prs }`
  2. For each PR: fetch diff → run engine → parse result → emit `review:pr_done`
  3. Assemble `Report { id: uuid, run_at, reviews, engine }`
  4. Write to `userData/reports/<id>.json`
  5. Update `seen.json`
  6. Emit `review:completed { report_id }`
  7. On any error: emit `review:error { message }`

#### 2.7 — Keychain commands (`keychain.rs`)
- Implement `save_api_key(service, key)` — writes to macOS Keychain
- Implement `has_api_key(service)` — returns bool
- Implement `delete_api_key(service)` — removes from Keychain
- **Do NOT implement `get_api_key` as a Tauri command** — Rust reads it internally only

#### 2.8 — Report persistence
- Implement `list_reports()` — scans `userData/reports/`, returns `Vec<ReportMeta> { id, run_at, pr_count, engine }`
- Implement `load_report(id)` — reads and deserialises `userData/reports/<id>.json`
- Implement `delete_report(id)` — deletes the file

#### 2.9 — Frontend: run progress UI
- Create `src/hooks/useTauriEvents.ts` — subscribes to all `review:*` and `scheduler:tick` events
- Create `src/store/reviewStore.ts` (Zustand):
  - `runStatus`: `idle | running | error`
  - `progress`: `{ total, done, current_pr }`
  - `lastReportId`: string | null
- Update Dashboard page placeholder to show:
  - Run status indicator (idle / running spinner / error)
  - Progress bar during active run
  - "Run Now" button → calls `trigger_run_now()` IPC
  - Last run timestamp
  - "Run Now" button in TrayPopover becomes functional

#### 2.10 — Phase 2 verification checklist
- `check_gh_auth` returns correct GitHub username in Configuration page
- "Run Now" fetches real PRs from GitHub (requires `gh auth login` on dev machine)
- Each PR diff is sent to configured engine and a valid `PRReview` JSON is parsed
- `userData/reports/<id>.json` is written after every run
- `userData/seen.json` is updated; re-running skips already-reviewed PRs
- Real-time events update Dashboard progress bar
- Force re-review toggle bypasses seen cache

---

### Phase 3 — Report Viewer

**Goal:** Full report browsing UI — PRCard, IssueCard, inline diff viewer, comment toggles, and approve/request-changes actions.

#### 3.1 — Reports page
- Create `src/pages/Reports.tsx`:
  - Calls `list_reports()` on mount
  - Renders a list of `ReportMeta` rows: run timestamp, PR count, engine name, "View" button
  - "Delete" button per row with confirmation
  - Clicking "View" navigates to `/reports/:id`

#### 3.2 — ReportViewer page
- Create `src/pages/ReportViewer.tsx`:
  - Calls `load_report(id)` on mount
  - Renders a `PRCard` for each `PRReview` in the report

#### 3.3 — PRCard component
- Create `src/components/review/PRCard.tsx`:
  - Header: PR number + title (monospace), author, repo, link icon → GitHub URL
  - `VerdictBadge`: APPROVE (green), REQUEST_CHANGES (red), NEEDS_DISCUSSION (amber)
  - Summary paragraph
  - Positive notes list (collapsible)
  - Issues list (one `IssueCard` per issue)
  - Action bar: "Approve" · "Request Changes" · "Post Selected Comments" buttons

#### 3.4 — VerdictBadge component
- Create `src/components/review/VerdictBadge.tsx`:
  - APPROVE → green badge
  - REQUEST_CHANGES → red badge
  - NEEDS_DISCUSSION → amber badge

#### 3.5 — IssueCard component
- Create `src/components/review/IssueCard.tsx`:
  - Header: severity `Badge` + category label + file path (if present) + line number
  - Description paragraph
  - Suggested comment (monospace, indented)
  - `CommentToggle` (checked by default for High/Medium, unchecked for Low)
  - "▶ View diff" toggle → expands `DiffViewer`

#### 3.6 — DiffViewer component
- Create `src/components/review/DiffViewer.tsx`:
  - Receives `DiffLine[]` (pre-extracted hunk)
  - Renders as a table, one row per line:
    - `add` lines: green-tinted background (`rgba(0,255,65,0.08)`), `+` gutter, green text
    - `remove` lines: red-tinted (`rgba(255,68,68,0.08)`), `−` gutter, dimmed red text
    - `context` lines: neutral surface background
    - `hunk` header lines (`@@ ... @@`): muted blue (`--color-cyan-300`), italic
  - Line numbers in muted right-aligned column
  - Collapsed by default; toggle expand/collapse per issue

#### 3.7 — CommentToggle component
- Create `src/components/review/CommentToggle.tsx`:
  - Checkbox-style toggle per issue
  - When checked: issue's `suggestedComment` will be included in the "Post Selected" batch
  - Drives local state in `reviewStore` (selected comment IDs per PR)

#### 3.8 — Diff hunk extraction (Rust)
- In `src-tauri/src/diff/extractor.rs`:
  - Implement `extract_hunk_for_line(diff: &str, filename: &str, target_line: u32, context: u32) -> Vec<DiffLine>`
  - Parses the unified diff, finds the hunk containing `target_line`, returns `context` lines above and below
- Call this during report generation: for each issue with a file + line, extract its hunk and store in `PRReview.issues[n].diff_hunk`

#### 3.9 — Diff position map (Rust)
- In `src-tauri/src/diff/parser.rs`:
  - Implement `parse_diff(raw_diff: &str) -> HashMap<String, HashMap<u32, u32>>`
  - Walks hunk headers (`@@ -old,count +new,count @@`), counts positions per file
  - Returns `file → new_line_number → diff_position` map
- Store result as `PRReview.diff_map` — used when posting inline comments

#### 3.10 — Action bar: post comments, approve, request changes
- "Post Selected Comments" button:
  - Collects all issues where `selected: true` for this PR
  - For each, looks up `diff_map[file][line]` → diff position
  - Issues with resolved position → include in `gh api` inline comments batch
  - Issues without position → fall back to a general review comment with file/line prefix
  - Calls `post_inline_comments()` IPC command
- "Approve" button → calls `approve_pr()` IPC command
- "Request Changes" button → opens a small modal for a body message → calls `request_changes()` IPC command
- Disable all buttons after action completes (prevent double-posting)

#### 3.11 — Phase 3 verification checklist
- Reports page lists all past runs, newest first
- Clicking a report opens ReportViewer with all PRs rendered
- Each PRCard shows correct verdict badge, issues, and positive notes
- IssueCard expand shows correct diff hunk with colour-coded lines
- CommentToggle correctly tracks selected state
- "Post Selected" posts batched inline comments to GitHub (visible on the PR)
- Approve and Request Changes buttons call GitHub API successfully

---

### Phase 4 — Scheduler

**Goal:** Automated scheduled runs using Rust cron, catch-up-on-wake support, LaunchAgent integration, and next-run display in tray and dashboard.

#### 4.1 — Rust cron scheduler (`scheduler.rs`)
- Add `cron` or `tokio-cron-scheduler` crate to `Cargo.toml`
- Implement `start_scheduler(config: ScheduleConfig, app_handle: AppHandle)`:
  - If `schedule.enabled`, register a daily cron job at `hour:minute`
  - On tick: emit `scheduler:tick { next_run }` to frontend, then call `run_review_session`
- Implement `get_next_run_time()` → returns ISO string of next scheduled run or `null`
- Implement `trigger_run_now()` → immediately fires `run_review_session` in a new thread
- Start scheduler on app launch (read config from disk, not from frontend)

#### 4.2 — Catch-up on wake
- Register for `NSWorkspace.didWakeNotification` (macOS power event) via Tauri plugin or raw AppKit
- On wake: check if a scheduled run was missed while asleep (compare `last_run_at` to scheduled time)
- If `catchUpOnWake: true` and run was missed → trigger `run_review_session` immediately

#### 4.3 — LaunchAgent integration
- Write a `com.difforbit.app.plist` LaunchAgent to `~/Library/LaunchAgents/` when the user enables scheduling
- The plist keeps DiffOrbit alive across reboots (login item equivalent for menu bar apps)
- Remove the plist when scheduling is disabled
- Show status in Configuration page: "LaunchAgent: installed / not installed"

#### 4.4 — Frontend: next-run display
- `src/hooks/useScheduler.ts` — subscribes to `scheduler:tick` and calls `get_next_run_time()` on mount
- Dashboard page: "Next run: HH:MM today / tomorrow" display
- TrayPopover: same next-run string, updates live

#### 4.5 — Phase 4 verification checklist
- Scheduling a run at a specific time fires `run_review_session` at that time
- `scheduler:tick` events update the tray and dashboard in real time
- Catch-up-on-wake fires a review if the Mac was asleep at the scheduled time
- LaunchAgent plist is correctly written and removed with scheduling toggle
- `get_next_run_time()` returns correct upcoming time

---

### Phase 5 — Profiles Editor

**Goal:** Full CRUD for language/framework review profiles, per-repo profile assignment, built-in profile reset, and JSON import/export.

#### 5.1 — Built-in profiles
- Hardcode the following built-in profiles in `src-tauri/src/commands/config.rs` (or load from embedded JSON):
  - Flutter / Dart
  - React / TypeScript
  - React Native
  - Swift
  - Kotlin
  - Java
  - C / C++
  - Generic (no framework assumptions)
- Each has a complete `system_prompt` string with reviewer persona and validation rules appropriate to the language/framework
- Built-ins are included in `AppConfig.profiles` on first launch if no config exists
- `isBuiltIn: true` — they can be reset to defaults but cannot be deleted

#### 5.2 — Profiles page
- Create `src/pages/Profiles.tsx`:
  - Left column: list of all profiles (built-in + custom), with active indicator
  - Right column: `ProfileEditor` for the selected profile
  - "New Profile" button → creates a blank custom profile
  - "Delete" button (disabled for built-ins)
  - "Reset to Default" button (built-ins only)
  - "Export JSON" / "Import JSON" buttons

#### 5.3 — ProfileEditor component
- Create `src/components/config/ProfileEditor.tsx`:
  - Name input
  - Languages multi-input (comma-separated tags: "dart", "yaml")
  - Extensions multi-input (".dart", ".yaml")
  - System prompt textarea (full-height, monospace, resizable)
  - "Save" button → calls `save_config()` with updated profiles array

#### 5.4 — Per-repo profile assignment
- In `RepoList.tsx`, the profile `<Select>` must be populated from `configStore.config.profiles`
- On profile change for a repo → update `RepoConfig.profileId` → save config

#### 5.5 — Reset built-in profile
- Implement `reset_profile(id)` Rust command — returns the original hardcoded profile object
- Frontend "Reset to Default" button → calls `reset_profile(id)` IPC → updates store → saves config

#### 5.6 — JSON import/export
- "Export JSON": serialise the selected profile to JSON, write to a user-chosen file via Tauri dialog
- "Import JSON": open file dialog, read JSON, validate schema, add to profiles list as a new custom profile

#### 5.7 — Phase 5 verification checklist
- All 8 built-in profiles present on first launch
- Creating a custom profile and saving persists it to `config.json`
- Deleting a custom profile removes it; delete button disabled for built-ins
- Resetting a built-in restores its original system prompt
- Per-repo profile selector shows all available profiles and saves correctly
- JSON export produces a valid file; JSON import adds a new profile

---

### Phase 6 — Polish & Distribution

**Goal:** Report history stats, app icon, code signing, notarisation, DMG build, and auto-updater.

#### 6.1 — Report history page
- Expand `src/pages/Reports.tsx` with a statistics section at the top:
  - Total PRs reviewed (all time)
  - Breakdown by verdict: Approved / Request Changes / Needs Discussion
  - Issues by severity (bar chart or simple number display in MatrixUI style)
  - Most-reviewed repositories
  - Average issues per PR
- All stats computed from `list_reports()` data client-side (no separate stats store needed)

#### 6.2 — App icon
- Create a DiffOrbit icon: a green matrix-style code diff symbol
- Export at all required macOS sizes: 16, 32, 64, 128, 256, 512, 1024px
- Place in `src-tauri/icons/` (Tauri expects `icon.png`, `icon.icns`, `icon.ico`)
- Update tray icon to use the final icon (not the placeholder green dot from Phase 1)

#### 6.3 — Code signing
- Obtain an Apple Developer certificate (Developer ID Application)
- Configure `tauri.conf.json` with `bundle.macOS.signingIdentity`
- Set `APPLE_CERTIFICATE`, `APPLE_CERTIFICATE_PASSWORD`, `APPLE_SIGNING_IDENTITY` env vars in CI
- Verify `codesign --verify --deep --strict dist/DiffOrbit.app` passes

#### 6.4 — Notarisation
- Configure `tauri.conf.json` with `bundle.macOS.notarization`:
  - `appleId`, `appleTeamId`, `appleIdPassword` (App-Specific Password)
- Notarise via `xcrun notarytool` or Tauri's built-in notarisation step
- Staple the ticket: `xcrun stapler staple DiffOrbit.app`
- Verify with `spctl --assess --type exec DiffOrbit.app`

#### 6.5 — DMG build
- Configure `tauri.conf.json` `bundle.targets` to include `dmg`
- Run `npm run tauri build` — produces a signed + notarised `.dmg` in `src-tauri/target/release/bundle/dmg/`
- Test: mount DMG, drag to Applications, launch, verify no Gatekeeper warning

#### 6.6 — Auto-updater
- Enable `tauri-plugin-updater` in `Cargo.toml` and `tauri.conf.json`
- Configure an update endpoint URL (can be a GitHub Releases JSON endpoint)
- On launch: check for updates silently; if available, show a non-intrusive banner in the app
- "Update Available" banner: version number + "Install & Restart" button

#### 6.7 — Final QA checklist
- Clean install on a fresh macOS machine (no dev tools) launches without error
- All 6 phases of functionality work end-to-end
- App is signed, notarised, and passes Gatekeeper
- Auto-updater detects and installs a new version
- Menu bar icon persists across reboots (LaunchAgent working)
- No API keys, tokens, or secrets are present anywhere in `config.json` or logs

---

## Session Startup Checklist (every Claude Code session)

```
1. Read this CLAUDE.md
2. cat .phase-tracker/state.json   (or initialise if missing)
3. Print Session Resume summary
4. Confirm which task to work on next
5. Work task by task, updating state.json after each completion
```

---

*Last updated: 2026-03-27 — covers all 6 phases, 40+ tasks*
