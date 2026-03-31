# DiffOrbit

> AI-powered PR code review desktop app for macOS

DiffOrbit lives in your menu bar and automatically reviews GitHub pull requests using AI — Anthropic Claude, any OpenAI-compatible endpoint, or your local Claude Code CLI session. Reviews are structured, inline-commented, and stored as local JSON reports you can browse at any time.

[![CI](https://github.com/Pratik948/difforbit/actions/workflows/ci.yml/badge.svg?event=check_run)](https://github.com/Pratik948/difforbit/actions/workflows/ci.yml)
[![Release](https://github.com/Pratik948/difforbit/actions/workflows/release.yml/badge.svg?event=release)](https://github.com/Pratik948/difforbit/actions/workflows/release.yml)
---
## Features

- **Menu-bar app** — lives in the macOS tray, never in the Dock
- **Three AI engines** — Anthropic API, OpenAI-compatible (Ollama, Groq, Together, etc.), Claude Code CLI
- **Structured reviews** — verdict (APPROVE / REQUEST CHANGES / NEEDS DISCUSSION), issues with severity + category + inline diff hunks, positive notes
- **Post directly to GitHub** — batch inline comments, approve, or request changes without leaving the app
- **Seen-PR cache** — skips already-reviewed, unchanged PRs; force-re-review toggle
- **Cron scheduler** — daily scheduled runs at configurable hour:minute; catch-up-on-wake
- **LaunchAgent** — survives reboots via `~/Library/LaunchAgents/com.difforbit.app.plist`
- **8 built-in review profiles** — Flutter/Dart, React/TS, React Native, Swift, Kotlin, Java, C/C++, Generic
- **Custom profiles** — full system-prompt editor with JSON import/export
- **Report history** — persistent JSON reports with statistics (verdicts, issue breakdown, top repos)
- **Configurable themes** — Matrix (dark green), Shadcn Dark, Shadcn Light; persisted to localStorage

---

## Stack

| Layer | Technology |
|-------|-----------|
| Shell | Tauri 2 (Rust) |
| Frontend | React 18 + TypeScript + Vite |
| State | Zustand |
| Routing | React Router v6 (MemoryRouter) |
| Styling | shadcn/ui + Tailwind CSS v4 + custom `--do-*` token layer |
| GitHub | `gh` CLI (shell-out) |
| AI | `reqwest` HTTP (Anthropic/OpenAI) · `claude` CLI (Claude Code) |
| Storage | JSON files in `~/Library/Application Support/DiffOrbit/` |
| Keychain | File-based secrets store (macOS Keychain via security-framework in production) |

---

## Architecture

### C4 — Level 1: System Context

```mermaid
C4Context
  title DiffOrbit — System Context

  Person(dev, "Developer", "macOS user who reviews GitHub PRs")

  System(difforbit, "DiffOrbit", "macOS menu-bar app that fetches PRs, sends diffs to AI, and posts structured reviews back to GitHub")

  System_Ext(github, "GitHub", "Source of PRs, diffs, and review submission target")
  System_Ext(anthropic, "Anthropic API", "Claude models via REST API")
  System_Ext(openai, "OpenAI-compatible API", "Any OpenAI-format endpoint (Ollama, Groq, Together, etc.)")
  System_Ext(claude_cli, "Claude Code CLI", "Local authenticated claude binary")
  System_Ext(keychain, "macOS Keychain", "Secure API key storage")

  Rel(dev, difforbit, "Configures repos, triggers reviews, reads reports")
  Rel(difforbit, github, "Fetches PR list + diffs, posts reviews/comments", "gh CLI")
  Rel(difforbit, anthropic, "Sends review prompt", "HTTPS / reqwest")
  Rel(difforbit, openai, "Sends review prompt", "HTTPS / reqwest")
  Rel(difforbit, claude_cli, "Sends review prompt", "stdin/stdout")
  Rel(difforbit, keychain, "Reads API keys", "security-framework")
```

---

### C4 — Level 2: Container Diagram

```mermaid
C4Container
  title DiffOrbit — Containers

  Person(dev, "Developer")

  Container_Boundary(app, "DiffOrbit.app") {
    Container(frontend, "React Frontend", "React 18 + TypeScript + Vite", "All UI pages, components, stores")
    Container(backend, "Tauri Rust Core", "Rust + Tauri 2", "IPC commands, scheduler, process management")
    ContainerDb(reports, "Reports Store", "JSON files", "userData/reports/<id>.json")
    ContainerDb(config, "Config Store", "JSON file", "userData/config.json")
    ContainerDb(seen, "Seen-PR Cache", "JSON file", "userData/seen.json")
    ContainerDb(keys, "Keys Store", "Protected file", "userData/.keys")
  }

  System_Ext(gh, "gh CLI")
  System_Ext(ai, "AI Engine")

  Rel(dev, frontend, "Interacts via", "WebView")
  Rel(frontend, backend, "invoke() IPC calls", "Tauri IPC bridge")
  Rel(backend, reports, "Read/write")
  Rel(backend, config, "Read/write")
  Rel(backend, seen, "Read/write")
  Rel(backend, keys, "Read/write")
  Rel(backend, gh, "Shell-out")
  Rel(backend, ai, "HTTP / CLI")
```

---

### C4 — Level 3: Component Diagram — Rust Backend

```mermaid
C4Component
  title DiffOrbit — Rust Backend Components

  Container_Boundary(rust, "Tauri Rust Core") {
    Component(lib, "lib.rs", "Entry point", "Builds Tauri app, registers tray, starts scheduler, wires all commands")

    Component(config_cmd, "commands/config.rs", "Config commands", "get_config, save_config, reset_profile; loads built-in profiles")
    Component(github_cmd, "commands/github.rs", "GitHub commands", "check_gh_auth, list_pending_prs, fetch_pr_diff, post_inline_comments, approve_pr, request_changes")
    Component(engines_cmd, "commands/engines.rs", "Engine abstraction", "run_engine() dispatches to Anthropic / OpenAI-compat / Claude Code; extract_json()")
    Component(review_cmd, "commands/review.rs", "Review orchestrator", "run_review_session: fetch → AI → parse → persist; list/load/delete_report")
    Component(keychain_cmd, "commands/keychain.rs", "Keychain commands", "save/has/delete_api_key (get_api_key is internal-only)")
    Component(scheduler_cmd, "commands/scheduler.rs", "Scheduler", "60s poll loop, compute_next_run, check_catch_up, LaunchAgent plist")

    Component(parser, "diff/parser.rs", "Diff parser", "parse_diff() → file→line→position map for GitHub inline comment API")
    Component(extractor, "diff/extractor.rs", "Diff extractor", "extract_hunk_for_line() → DiffLine[] for UI display")

    Component(models, "models/", "Data models", "AppConfig, PullRequest, PRReview, ReviewIssue, Report, EngineConfig")
  }

  Rel(lib, config_cmd, "registers")
  Rel(lib, github_cmd, "registers")
  Rel(lib, engines_cmd, "calls")
  Rel(lib, review_cmd, "registers + calls via tray")
  Rel(lib, keychain_cmd, "registers")
  Rel(lib, scheduler_cmd, "starts on launch")
  Rel(review_cmd, engines_cmd, "run_engine()")
  Rel(review_cmd, github_cmd, "fetch_pr_diff()")
  Rel(engines_cmd, parser, "parse_diff()")
  Rel(engines_cmd, extractor, "extract_hunk_for_line()")
```

---

### C4 — Level 3: Component Diagram — React Frontend

```mermaid
C4Component
  title DiffOrbit — React Frontend Components

  Container_Boundary(fe, "React Frontend") {
    Component(main, "main.tsx", "Entry", "applyTheme(), MemoryRouter, Toaster")
    Component(app, "App.tsx", "Root", "Two-column layout: Sidebar + routed main area")

    Component(sidebar, "layout/Sidebar.tsx", "Navigation", "Nav links, theme-aware sidebar")
    Component(windowframe, "layout/WindowFrame.tsx", "Chrome", "Header bar, wraps entire app")
    Component(traypopover, "layout/TrayPopover.tsx", "Tray UI", "Status, next run, Run Now — shown from tray")

    Component(dashboard, "pages/Dashboard.tsx", "Dashboard", "Run status, progress bar, next-run, last report link")
    Component(reports, "pages/Reports.tsx", "Reports list", "Report history stats + sortable list")
    Component(viewer, "pages/ReportViewer.tsx", "Report viewer", "Loads report, renders PRCard per review")
    Component(config, "pages/Configuration.tsx", "Configuration", "GitHub, repos, engine, schedule sections")
    Component(profiles, "pages/Profiles.tsx", "Profiles", "Two-column: list + ProfileEditor")

    Component(prcard, "review/PRCard.tsx", "PR Card", "Verdict, summary, issues list, action bar")
    Component(issucard, "review/IssueCard.tsx", "Issue Card", "Severity/category/file, comment, diff toggle")
    Component(diffview, "review/DiffViewer.tsx", "Diff Viewer", "Colour-coded add/remove/context/hunk rows")
    Component(verdict, "review/VerdictBadge.tsx", "Verdict Badge", "APPROVE / REQUEST_CHANGES / NEEDS_DISCUSSION")
    Component(toggle, "review/CommentToggle.tsx", "Comment Toggle", "Checkbox: include issue in batch post")

    Component(repolist, "config/RepoList.tsx", "Repo List", "Add/remove repos, profile picker, enable toggle")
    Component(engsel, "config/EngineSelector.tsx", "Engine Selector", "Radio + conditional fields + API key save/delete")
    Component(schedpick, "config/SchedulePicker.tsx", "Schedule Picker", "Hour/minute inputs, catch-up toggle, LaunchAgent")
    Component(profed, "config/ProfileEditor.tsx", "Profile Editor", "Name/languages/extensions/system-prompt, save/reset/delete")

    Component(stores, "store/", "Zustand stores", "reviewStore (run status, progress), configStore (AppConfig)")
    Component(hooks, "hooks/", "Hooks", "useTauriEvents, useScheduler")
    Component(ipc, "ipc/", "IPC wrappers", "Typed invoke() wrappers: config, github, review, engines")
    Component(types, "types/", "TypeScript types", "AppConfig, PullRequest, PRReview, Report, EngineConfig")
  }

  Rel(main, app, "renders")
  Rel(app, sidebar, "left column")
  Rel(app, dashboard, "route /")
  Rel(app, reports, "route /reports")
  Rel(app, viewer, "route /reports/:id")
  Rel(app, config, "route /configuration")
  Rel(app, profiles, "route /profiles")
  Rel(viewer, prcard, "one per PRReview")
  Rel(prcard, issucard, "one per issue")
  Rel(issucard, diffview, "expandable")
  Rel(issucard, toggle, "per issue")
  Rel(prcard, verdict, "header")
  Rel(dashboard, stores, "reads runStatus, progress")
  Rel(hooks, stores, "writes on Tauri events")
  Rel(config, ipc, "get_config / save_config")
  Rel(prcard, ipc, "post_inline_comments / approve / request_changes")
```

---

## Review Flow

```mermaid
flowchart TD
    A([User clicks Run Now]) --> B[trigger_run_now IPC]
    B --> C[Read AppConfig from disk]
    C --> D[Load seen.json cache]
    D --> E{For each enabled repo}
    E --> F[gh pr list --reviewer @me]
    F --> G{PR in seen.json\nwith same updatedAt?}
    G -->|Yes| E
    G -->|No| H[gh pr diff → raw unified diff]
    H --> I[Emit review:started]
    I --> J{Engine type?}
    J -->|anthropic| K[POST /v1/messages\nAnthropic API]
    J -->|openai_compatible| L[POST /chat/completions\nOpenAI-compat endpoint]
    J -->|claude_code| M[claude -p prompt\nCLI subprocess]
    K & L & M --> N["extract_json: find first brace, parse to PRReview"]
    N --> O[Parse RawReview → PRReview]
    O --> P[parse_diff → diffMap\nfile→line→position]
    P --> Q[extract_hunk_for_line\nper issue with file+line]
    Q --> R[Emit review:pr_done]
    R --> E
    E -->|all done| S[Assemble Report JSON]
    S --> T[Write userData/reports/timestamp.json]
    T --> U[Update seen.json]
    U --> V[Emit review:completed]
    V --> W([Frontend updates\nDashboard + Reports page])
```

---

## Scheduler Flow

```mermaid
flowchart LR
    subgraph Startup
        A([App Launch]) --> B[start_scheduler]
        A --> C[check_catch_up]
    end

    subgraph Scheduler Loop
        B --> D{schedule.enabled?}
        D -->|No| E[Sleep 60s] --> D
        D -->|Yes| F[compute_next_run\nhour:minute today/tomorrow]
        F --> G{secs_until > 0?}
        G -->|Yes| H[Sleep min 60s] --> D
        G -->|No| I[run_review_session]
        I --> J[Emit scheduler:tick]
        J --> K[Sleep 61s] --> D
    end

    subgraph Catch-up on Wake
        C --> L{catchUpOnWake\n+ enabled?}
        L -->|Yes| M{Scheduled time\npassed today?}
        M -->|Yes| N{last_run_at\nbefore scheduled?}
        N -->|Yes| O[run_review_session\nimmediately]
    end
```

---

## Data Flow — Posting Inline Comments

```mermaid
sequenceDiagram
    participant UI as PRCard (React)
    participant IPC as Tauri IPC
    participant GH as github.rs
    participant API as GitHub API

    UI->>UI: User checks CommentToggle on issues
    UI->>UI: "Post N Comments" button clicked
    UI->>UI: For each selected issue: diffMap[file][line] → position
    UI->>IPC: post_inline_comments(repo, number, comments[], commitSha)
    IPC->>GH: post_inline_comments command
    GH->>GH: Build JSON body {commit_id, event:"COMMENT", comments:[]}
    GH->>GH: Write body to temp file
    GH->>API: gh api POST /repos/{owner}/{repo}/pulls/{number}/reviews --input tmp.json
    API-->>GH: 200 OK / error
    GH-->>IPC: PostResult {posted, failed}
    IPC-->>UI: Result
    UI->>UI: Toast success/error + disable action bar
```

---

## Data Models

```mermaid
erDiagram
    AppConfig {
        string githubUsername
        ScheduleConfig schedule
        EngineConfig engine
        RepoConfig[] repos
        ReviewProfile[] profiles
        bool showDiff
        int diffContext
    }

    RepoConfig {
        string owner
        string repo
        string profileId
        bool enabled
    }

    EngineConfig {
        string type
        string model
        string baseUrl
        int maxTokens
        float temperature
    }

    ReviewProfile {
        string id
        string name
        string[] languages
        string[] extensions
        string systemPrompt
        bool isBuiltIn
    }

    Report {
        string id
        string runAt
        string engine
        PRReview[] reviews
    }

    PRReview {
        PullRequest pr
        string verdict
        string summary
        ReviewIssue[] issues
        string[] positiveNotes
        string overallNotes
        string reviewedAt
        string engine
        map diffMap
        string commitSha
    }

    ReviewIssue {
        string file
        int line
        string description
        string severity
        string category
        string suggestedComment
        bool selected
        DiffLine[] diffHunk
    }

    PullRequest {
        int number
        string title
        string author
        string url
        string repo
        string diff
        string[] files
        string headSha
    }

    AppConfig ||--o{ RepoConfig : "repos"
    AppConfig ||--o{ ReviewProfile : "profiles"
    AppConfig ||--|| EngineConfig : "engine"
    AppConfig ||--|| ScheduleConfig : "schedule"
    Report ||--o{ PRReview : "reviews"
    PRReview ||--|| PullRequest : "pr"
    PRReview ||--o{ ReviewIssue : "issues"
```

---

## File Structure

```
difforbit/
├── src-tauri/
│   ├── Cargo.toml
│   ├── tauri.conf.json
│   └── src/
│       ├── lib.rs                    ← app entry, tray, scheduler bootstrap
│       ├── main.rs
│       ├── commands/
│       │   ├── config.rs             ← get/save config, built-in profiles, reset_profile
│       │   ├── engines.rs            ← run_engine() → Anthropic / OpenAI / Claude Code
│       │   ├── github.rs             ← gh CLI wrappers
│       │   ├── keychain.rs           ← save/has/delete API keys (get is internal-only)
│       │   ├── review.rs             ← orchestrator, report CRUD
│       │   └── scheduler.rs          ← cron loop, catch-up, LaunchAgent plist
│       ├── diff/
│       │   ├── parser.rs             ← unified diff → position map
│       │   └── extractor.rs          ← hunk extraction for inline display
│       └── models/
│           ├── config.rs             ← AppConfig, RepoConfig, ScheduleConfig, ReviewProfile
│           ├── engine.rs             ← EngineConfig, RawReview (AI response shape)
│           ├── pr.rs                 ← PullRequest
│           └── review.rs             ← PRReview, ReviewIssue, Report, DiffLine
│
├── src/
│   ├── main.tsx                      ← applyTheme(), MemoryRouter, Toaster
│   ├── App.tsx                       ← two-column layout, all routes
│   ├── pages/
│   │   ├── Dashboard.tsx             ← run status, progress bar, next-run
│   │   ├── Reports.tsx               ← history stats + report list
│   │   ├── ReportViewer.tsx          ← full PRCard rendering per review
│   │   ├── Configuration.tsx         ← GitHub / repos / engine / schedule
│   │   └── Profiles.tsx              ← two-column profile editor
│   ├── components/
│   │   ├── layout/                   ← WindowFrame, Sidebar, TrayPopover
│   │   ├── review/                   ← PRCard, IssueCard, DiffViewer, VerdictBadge, CommentToggle
│   │   └── config/                   ← RepoList, EngineSelector, SchedulePicker, ProfileEditor
│   ├── hooks/
│   │   ├── useTauriEvents.ts         ← review:* event subscriptions
│   │   └── useScheduler.ts           ← scheduler:tick subscription + get_next_run_time
│   ├── store/
│   │   ├── reviewStore.ts            ← runStatus, progress, lastReportId
│   │   └── configStore.ts            ← AppConfig load/save
│   ├── ipc/                          ← typed invoke() wrappers
│   └── types/                        ← TypeScript interfaces (source of truth)
│
└── .phase-tracker/state.json         ← build progress (gitignored)
```

---

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **Tauri not Electron** | ~5 MB binary vs ~150 MB; native macOS APIs; WebKit rendering |
| **Rust layer is a thin shell** | Only shells out to `gh` and `claude`; no complex async orchestration in Rust |
| **OpenAI-compatible covers everything** | One engine type handles OpenAI, Ollama, Groq, Together, Mistral, any local model |
| **API keys never in config.json** | Written to `userData/.keys` (file-based; macOS Keychain in production); `get_api_key` is NOT an IPC command |
| **Reports as JSON files** | No database — simple, portable, inspectable; each report is self-contained |
| **shadcn/ui + token layer** | Components use `var(--do-*)` CSS vars; `applyTheme()` swaps all tokens; shadcn vars bridged in `App.css` |
| **MemoryRouter not BrowserRouter** | Tauri uses `tauri://` protocol; hash/history routing would need extra config |
| **Seen-PR cache by updatedAt** | Avoids re-reviewing unchanged PRs between runs; bypassed by force flag |
| **60s poll scheduler** | Simple, restartable, config-hot-reload on each tick; no cron crate dependency |

---

## Setup (Development)

### Prerequisites

```bash
# Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Node 20+
node --version  # must be >= 20

# GitHub CLI
brew install gh && gh auth login

# Claude Code CLI (only needed for claude_code engine)
npm install -g @anthropic-ai/claude-code && claude
```

### Install & run

```bash
# 1. Install frontend deps
npm install

# 2. Dev mode (opens Tauri window with hot-reload)
npm run tauri dev
```

### Build (macOS only)

```bash
npm run tauri build
# Output: src-tauri/target/release/bundle/dmg/DiffOrbit_*.dmg
```

---

## Storage Layout

All data is stored under `~/Library/Application Support/DiffOrbit/`:

```
~/Library/Application Support/DiffOrbit/
├── config.json          ← AppConfig (repos, schedule, engine, profiles)
├── .keys                ← API keys (never committed, never in config.json)
├── seen.json            ← { "owner/repo": { "42": { reviewed_at, updated_at } } }
└── reports/
    ├── 1711234567890.json
    ├── 1711234999000.json
    └── ...
```

---

## Tauri Events (Rust → Frontend)

| Event | Payload | Fired when |
|-------|---------|-----------|
| `review:started` | `{ total_prs: number }` | Review session begins |
| `review:pr_done` | `{ pr_number, verdict, issues_count }` | Each PR finishes |
| `review:completed` | `{ report_id: string }` | All PRs done, report written |
| `review:error` | `{ message: string }` | Any unrecoverable error |
| `scheduler:tick` | `{ next_run: string }` | Every 60s when scheduler is enabled |

---

## IPC Command Surface

```
config:    get_config · save_config · reset_profile
github:    check_gh_auth · list_pending_prs · fetch_pr_diff
           post_inline_comments · approve_pr · request_changes
keychain:  save_api_key · has_api_key · delete_api_key
review:    trigger_run_now · list_reports · load_report · delete_report
scheduler: get_next_run_time · trigger_run_now_cmd
           get_launch_agent_status · set_launch_agent
```

---

## Built-in Review Profiles

| Profile | Languages | Focus areas |
|---------|-----------|-------------|
| Generic | any | Correctness, readability, maintainability, security |
| React / TypeScript | TS, JS | Hook correctness, re-renders, type safety, accessibility |
| Flutter / Dart | Dart | Widget rebuilds, const constructors, null safety, state management |
| Swift | Swift | Memory management, retain cycles, async/await, optionals |
| Kotlin | Kotlin | Coroutine scope, null safety, Jetpack Compose recomposition |
| Java | Java | Exception handling, resource leaks, thread safety |
| React Native | TS, JS | Bridge calls, FlatList optimisation, native modules |
| C / C++ | C, C++ | Memory safety, buffer overflows, RAII, thread-safety |

---

## Pending (macOS dev machine required)

- [ ] **6.2** Proper app icon — 16/32/64/128/256/512/1024px `.icns`
- [ ] **6.3** Code signing — Apple Developer ID Application certificate
- [ ] **6.4** Notarisation — `xcrun notarytool` + `xcrun stapler`
- [ ] **6.5** DMG build — `npm run tauri build`
- [ ] **6.6** Auto-updater — `tauri-plugin-updater` + GitHub Releases JSON endpoint

---

## License

MIT
