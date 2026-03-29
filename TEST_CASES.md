# DiffOrbit — Test Cases

All manually verified test cases for QA. Each ID is stable across runs.

---

## 1. Configuration (CFG)

| ID | Title | Preconditions | Steps | Expected Result |
|----|-------|---------------|-------|-----------------|
| CFG-01 | Save GitHub username | App open, Configuration page | Enter username → Save configuration | `config.json` contains `githubUsername` |
| CFG-02 | GitHub auth check | `gh auth login` done on host | Click "Check auth" on Configuration page | Green indicator + authenticated username shown |
| CFG-03 | GitHub auth check fails | `gh` not logged in | Click "Check auth" | Red indicator with error message |
| CFG-04 | Add repository | Configuration page | Click "Add Repo" → fill `owner/repo` → confirm | Repo appears in list; saved to `config.json` |
| CFG-05 | Delete repository | At least one repo in list | Click delete on a repo row → confirm | Row removed; `config.json` updated |
| CFG-06 | Toggle repo enabled/disabled | Repo in list | Toggle enabled switch | `enabled` field flipped in config; re-run skips disabled repos |
| CFG-07 | Config persists across restart | Config saved | Quit and relaunch app | All fields (username, repos, engine, schedule) restored |
| CFG-08 | Select Anthropic engine | Configuration page | Choose Anthropic radio → enter model → save API key | `engine.type = "anthropic"` in config; keychain entry created |
| CFG-09 | Select OpenAI-compat engine | Configuration page | Choose OpenAI-compatible → enter base URL + model + API key → save | Config and keychain updated correctly |
| CFG-10 | Select Claude Code CLI engine | Configuration page | Choose Claude Code CLI → leave model blank → save | `engine.type = "claude_code"`, model empty |
| CFG-11 | Claude Code CLI model dropdown | Claude CLI installed | Switch to Claude Code CLI engine | Dropdown auto-populates from `claude models --output json` |
| CFG-12 | Claude Code CLI model dropdown refresh | Models dropdown visible | Click "↻ refresh" | Dropdown reloads model list |
| CFG-13 | API key save | Anthropic engine selected | Enter key → click Save | `has_api_key` returns true; input clears |
| CFG-14 | API key delete | API key set | Click Delete next to key status | Key removed from Keychain; status shows "NOT SET" |
| CFG-15 | Schedule enable/disable | Configuration page | Toggle Schedule enabled → set time → save | `schedule.enabled` saved; LaunchAgent plist written/removed |
| CFG-16 | Save config with no repos | Empty repo list | Click Save | No error; `config.json` has `repos: []` |

---

## 2. Review Pipeline (RUN)

| ID | Title | Preconditions | Steps | Expected Result |
|----|-------|---------------|-------|-----------------|
| RUN-01 | Run Now — no repos configured | Empty repo list | Click Run Now | Toast: "No repos configured" |
| RUN-02 | Run Now — no pending PRs | Repo configured, no reviewer-requested PRs | Click Run Now | Toast: "No pending PRs found" or 0 PRs message |
| RUN-03 | Run Now — pending PR found | PR open with reviewer requested | Click Run Now | Progress bar appears; review completes; report created |
| RUN-04 | Review progress bar | Run in progress | Observe Dashboard during run | Bar advances for each completed PR |
| RUN-05 | review:started event | Run triggered | Observe real-time events | `review:started` fires with correct total PR count |
| RUN-06 | review:pr_done event | Run in progress | Observe events | `review:pr_done` fires per PR with verdict |
| RUN-07 | review:completed event | Run finishes | Observe events | `review:completed` fires with `report_id` and `pr_count` |
| RUN-08 | review:error event | Trigger error (e.g. bad API key) | Observe events | `review:error` fires; error shown on Dashboard |
| RUN-09 | Seen cache — skip unchanged PR | PR already reviewed with same SHA | Run Now again | PR skipped; log shows "skipped" |
| RUN-10 | Force run bypasses cache | PR in seen cache | Use Re-review button | PR re-reviewed regardless of seen cache |
| RUN-11 | Changed files only | PR updated since last review | Use "Re-review changed files" | Only diffs for changed files sent to AI |
| RUN-12 | Large diff truncation | PR with >60K char diff | Run review | Diff truncated; truncation notice in prompt; review still completes |
| RUN-13 | Parallel PR review | 3+ pending PRs | Run Now | All PRs reviewed concurrently (max 3); no race errors |
| RUN-14 | Claude CLI timeout | Claude CLI hanging | Trigger review with claude_code engine | Error after 180s: "claude CLI timed out" |
| RUN-15 | HTTP API timeout | Anthropic API unresponsive | Trigger review with anthropic engine | Error after 120s |
| RUN-16 | Report written to disk | Review completes | Check `~/Library/Application Support/DiffOrbit/reports/` | JSON file with correct structure present |
| RUN-17 | seen.json updated | Review completes | Check `userData/seen.json` | PR entry added with `reviewed_at` and `updated_at` |
| RUN-18 | Log file created | App launched + review triggered | Check `userData/logs/difforbit.*.log` | Log file present with INFO entries for each pipeline step |

---

## 3. Reports & Report Viewer (REP)

| ID | Title | Preconditions | Steps | Expected Result |
|----|-------|---------------|-------|-----------------|
| REP-01 | Reports page loads | At least one report on disk | Navigate to Reports | Report list shows with timestamp, PR count, engine |
| REP-02 | Reports page empty state | No reports | Navigate to Reports | "No reports yet" panel with link to Dashboard |
| REP-03 | PR details expansion | Reports page, report with PRs | Click "▶ PRs" toggle | Compact list of PR title, repo, verdict appears |
| REP-04 | Collapse PR details | Expanded report row | Click "▼ PRs" toggle | PR list collapses |
| REP-05 | Stats panel | 2+ reports | Navigate to Reports | Stats: total PRs, verdicts breakdown, issue counts, avg per PR |
| REP-06 | Top repos stat | Multiple repos reviewed | Navigate to Reports | Top repos listed by review count |
| REP-07 | Search by PR title | Search bar | Type part of a PR title | Only reports containing that PR title shown |
| REP-08 | Search by repo name | Search bar | Type repo name | Matching reports shown |
| REP-09 | Search by engine | Search bar | Type engine name | Reports with that engine shown |
| REP-10 | Verdict filter | FilterBar | Select "APPROVE" filter | Only reports containing an APPROVE review shown |
| REP-11 | Date filter — Today | FilterBar | Select "Today" | Only today's reports shown |
| REP-12 | Date filter — This Week | FilterBar | Select "This Week" | Only last 7 days shown |
| REP-13 | View report | Reports list | Click "View" on a report row | ReportViewer opens with all PRs rendered |
| REP-14 | Delete report | Reports list | Click "Delete" → confirm in modal | Report removed from list and disk |
| REP-15 | Delete report cancel | Confirm modal open | Click Cancel | Report not deleted |
| REP-16 | Dashboard shows reports exist | Reports on disk, app restarted | Navigate to Dashboard | "No reviews yet" panel NOT shown (hasRuns = true) |
| REP-17 | VerdictBadge colours | ReportViewer | Observe badges | APPROVE = green, REQUEST_CHANGES = red, NEEDS_DISCUSSION = amber |
| REP-18 | Diff hunk expands | IssueCard with diffHunk | Click "View diff" | Colour-coded diff lines appear |
| REP-19 | Diff hunk collapses | Diff open | Click "Hide diff" | Diff collapses |
| REP-20 | Positive notes expand/collapse | PRCard with positive notes | Click "Show N positive notes" | List shows/hides |
| REP-21 | Export MD | PRCard | Click "Export MD" | Spinner shows; file saved to Downloads; success toast |
| REP-22 | Export PDF | PRCard | Click "Export PDF" | Spinner shows; print dialog opens |
| REP-23 | Overall notes shown | PRCard | View report | `overallNotes` paragraph rendered below issues |

---

## 4. Inline Comments / Approve / Request Changes (ACT)

| ID | Title | Preconditions | Steps | Expected Result |
|----|-------|---------------|-------|-----------------|
| ACT-01 | Select issue for posting | IssueCard | Toggle "Include in review" checkbox | Checkbox state changes; "Post N comments" count updates |
| ACT-02 | Post selected comments | Issues selected | Click "Post N comments" | Comments posted at correct line on GitHub PR; success toast |
| ACT-03 | Comment at correct line | Issue with file+line | Post comment | GitHub shows comment on exact line, not offset |
| ACT-04 | Edit comment before posting | IssueCard | Click "edit" → modify text → Save | Modified text used when posting |
| ACT-05 | Edit comment cancel | Edit textarea open | Click "Cancel" | Original text restored |
| ACT-06 | Approve PR | PRCard | Click "Approve" | GitHub PR shows approved review; success toast |
| ACT-07 | Request Changes | PRCard | Click "Request changes" → enter body → Submit | GitHub PR shows review with requested changes; toast |
| ACT-08 | Request Changes cancel | Modal open | Click Cancel | Modal closes; no API call |
| ACT-09 | Buttons disabled after action | Any action taken | Check action bar | Post/Approve/Request Changes all disabled |
| ACT-10 | "Reviewed on" timestamp | Action taken | Observe below action bar | "Reviewed on {datetime}" shows |
| ACT-11 | Actioned state persists navigation | Action taken | Navigate away → return to report | Buttons still disabled |
| ACT-12 | Actioned state resets on new SHA | Action taken, PR updated, new report generated | Open new report for same PR | Buttons re-enabled (new commitSha) |
| ACT-13 | No file/line — issue excluded | Issue with null file/line | Select that issue → Post | Issue excluded from batch (no path to post to) |
| ACT-14 | Post 0 selected | No issues selected | Click "Post 0 comments" (disabled) | Button disabled; no API call |

---

## 5. Profiles (PRF)

| ID | Title | Preconditions | Steps | Expected Result |
|----|-------|---------------|-------|-----------------|
| PRF-01 | Built-in profiles present | Fresh install | Navigate to Profiles | 8 built-in profiles listed |
| PRF-02 | Built-in profile not deletable | Select built-in | Check action buttons | Delete button disabled/absent |
| PRF-03 | Create custom profile | Profiles page | Click "New Profile" → fill name, languages, prompt → Save | Profile added to list and `config.json` |
| PRF-04 | Edit custom profile | Custom profile exists | Select → modify prompt → Save | Changes saved |
| PRF-05 | Delete custom profile | Custom profile exists | Click Delete → confirm | Profile removed |
| PRF-06 | Reset built-in profile | Built-in profile modified | Click "Reset to Default" | Original system prompt restored |
| PRF-07 | Assign profile to repo | Repo and profiles exist | RepoList profile select → change → Save | `RepoConfig.profileId` updated |
| PRF-08 | Profile used in review | Repo with custom profile | Run Now | AI prompt uses custom profile's system_prompt |
| PRF-09 | Export profile JSON | Profile selected | Click "Export JSON" | File dialog; valid JSON written |
| PRF-10 | Import profile JSON | Valid profile JSON file | Click "Import JSON" → select file | Profile added as new custom entry |

---

## 6. Theme System (THM)

| ID | Title | Preconditions | Steps | Expected Result |
|----|-------|---------------|-------|-----------------|
| THM-01 | Switch to Matrix theme | Configuration page | Click Matrix card → Save | App switches to dark green Matrix aesthetic |
| THM-02 | Switch to Shadcn Dark | Configuration page | Click Shadcn Dark card → Save | App switches to neutral dark theme |
| THM-03 | Switch to Shadcn Light | Configuration page | Click Shadcn Light card → Save | App switches to white/light theme |
| THM-04 | Theme persists restart | Theme saved | Quit and relaunch | Same theme applied on startup |
| THM-05 | Create custom theme | Configuration page, Appearance section | Click "New Theme" → enter name → choose base → modify vars → Save | Custom theme card appears; theme applied |
| THM-06 | Edit custom theme | Custom theme exists | Click "Edit" on card → change accent → Save | Theme updates live |
| THM-07 | Delete custom theme | Custom theme exists | Click delete on custom card | Card removed; if active, falls back to default |
| THM-08 | Custom theme persists restart | Custom theme saved | Quit and relaunch | Custom theme still in list; if active, applied |
| THM-09 | Active theme card highlighted | Any theme | View Appearance section | Active theme card has active border |

---

## 7. Onboarding (ONB)

| ID | Title | Preconditions | Steps | Expected Result |
|----|-------|---------------|-------|-----------------|
| ONB-01 | Wizard shows on first launch | `onboardingComplete = false` | Launch app | Wizard overlay appears |
| ONB-02 | Wizard does not show after completion | `onboardingComplete = true` | Launch app | No wizard; Dashboard shown directly |
| ONB-03 | Step navigation | Wizard open | Click Next / Back | Steps advance/retreat correctly |
| ONB-04 | Engine selection saves | Step 3 (AI Engine) | Pick engine type | `config.engine.type` saved immediately |
| ONB-05 | Notification permission prompt | Complete wizard | Click Finish on last step | macOS shows notification permission dialog |
| ONB-06 | Onboarding config reflected in Configuration | Complete wizard with values | Navigate to Configuration | Fields match what was entered during onboarding |
| ONB-07 | Wizard re-accessible | Onboarding done | Click ? icon or help shortcut | Wizard or help modal opens |

---

## 8. Scheduler (SCH)

| ID | Title | Preconditions | Steps | Expected Result |
|----|-------|---------------|-------|-----------------|
| SCH-01 | Enable schedule | Configuration page | Toggle Schedule → set time → Save | LaunchAgent plist written; scheduler starts |
| SCH-02 | Disable schedule | Schedule enabled | Toggle off → Save | LaunchAgent plist removed |
| SCH-03 | Next run time shown | Schedule enabled | View Dashboard or TrayPopover | "Next run: HH:MM" displays |
| SCH-04 | Scheduled run fires | Schedule set 1 min ahead | Wait | Review session starts at scheduled time |
| SCH-05 | Catch-up on wake | Schedule missed while asleep | Wake Mac | Review triggers if `catchUpOnWake = true` |

---

## 9. Edge Cases & Error Handling (ERR)

| ID | Title | Preconditions | Steps | Expected Result |
|----|-------|---------------|-------|-----------------|
| ERR-01 | `gh` not in PATH | Misconfigured PATH | Run Now | Clear error: "gh CLI not found" |
| ERR-02 | `gh` not authenticated | `gh auth logout` | Run Now | Error: auth status failure |
| ERR-03 | API key missing for Anthropic | No key in Keychain | Run Now with Anthropic engine | Error: "Anthropic API key not set" |
| ERR-04 | Invalid API key | Wrong key stored | Run Now with Anthropic engine | Error from API; surfaced as `review:error` |
| ERR-05 | AI returns malformed JSON | Adversarial / model error | Run Now | Error: JSON parse failure; other PRs unaffected |
| ERR-06 | Empty diff | PR with no diff | Run Now | Review skipped or handled gracefully |
| ERR-07 | Very large number of PRs | 10+ pending PRs | Run Now | All reviewed (up to semaphore limit); no crash |
| ERR-08 | Network offline | Wifi off | Run Now | Timeout error shown within 120s |
| ERR-09 | Report file deleted externally | Delete a report JSON manually | View Reports | Report missing from list or gracefully skipped |
| ERR-10 | Repo not found on GitHub | Invalid `owner/repo` | Run Now | Error per-repo surfaced in event; other repos continue |
| ERR-11 | PR diff fetch fails | Network issue mid-run | Run Now | `review:error` emitted for that PR; others continue |
| ERR-12 | Window close hides to tray | Main window visible | Click × | Window hides; app still in menu bar |
| ERR-13 | App quits cleanly | App running | Cmd+Q or tray Quit | All in-progress operations cancelled; no crash |
| ERR-14 | Config file corrupted | Manually corrupt `config.json` | Launch app | Falls back to default config; no crash |
| ERR-15 | Duplicate repo in config | Same repo added twice | Run Now | PRs not duplicated in results |
