---
name: phase-tracker
description: >
  Tracks progress through phased implementation projects in Claude Code. Use this skill
  whenever a project has a CLAUDE.md, a phased build plan, numbered phases, or multi-step
  implementation milestones. Trigger when the user asks "what's the status", "what's pending",
  "what's left to do", "summarize progress", "what have we done", "whats completed", or any
  variation. Also triggers at the start of a Claude Code session when a CLAUDE.md is detected,
  to restore context from the last session. Maintains a persistent `.phase-tracker/state.json`
  in the project root to survive across sessions. Always use this skill when a phased project
  is in context — don't just answer from memory.
---

# Phase Tracker

Persistent memory and status reporting for phased implementation projects in Claude Code.

---

## Purpose

When working on a multi-phase project (AlgoDesk, MatrixUI, LexiQ, etc.), Claude Code sessions
are stateless — context is lost between runs. This skill:

1. **Writes progress to disk** after each phase or significant step completes
2. **Restores context** at the start of a new session by reading saved state
3. **Answers status queries** ("what's done?", "what's pending?") with a clean summary

---

## State File Location

Always store state at:

```
<project_root>/.phase-tracker/state.json
```

Create the directory if it doesn't exist. Add `.phase-tracker/` to `.gitignore` if not present.

---

## State Schema

```json
{
  "project": "ProjectName",
  "last_updated": "ISO 8601 timestamp",
  "phases": [
    {
      "id": "1",
      "title": "Phase title",
      "status": "completed | in_progress | pending | skipped",
      "completed_at": "ISO 8601 or null",
      "tasks": [
        {
          "id": "1.1",
          "title": "Task description",
          "status": "completed | in_progress | pending | skipped",
          "notes": "optional notes, blockers, decisions made"
        }
      ],
      "notes": "phase-level notes"
    }
  ],
  "decisions": [
    {
      "timestamp": "ISO 8601",
      "decision": "What was decided and why"
    }
  ],
  "blockers": [],
  "session_log": [
    {
      "timestamp": "ISO 8601",
      "summary": "One sentence: what happened this session"
    }
  ]
}
```

---

## Workflow

### On Session Start

1. Look for `CLAUDE.md` in the project root to identify the project
2. Check for `.phase-tracker/state.json`
3. If found → load and print a **Session Resume** summary (see format below)
4. If not found → offer to initialize tracking from the CLAUDE.md phases

### Initializing from CLAUDE.md

When initializing, parse the phase/task structure from CLAUDE.md and create the state file with all phases set to `pending`. Confirm with the user before writing.

```bash
mkdir -p .phase-tracker
# write state.json with parsed phases
echo ".phase-tracker/" >> .gitignore
```

### After Completing Work

After any phase or significant task completes, **automatically update state.json** without waiting for the user to ask. Use the current timestamp. Append a session_log entry.

### On Status Query

Triggered by: "status", "what's done", "what's pending", "what's left", "summarize", "progress", "whats completed", etc.

Read state.json and render the **Status Report** format below.

---

## Output Formats

### Session Resume (on session start)

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📂 PROJECT: <ProjectName>
Last session: <relative time, e.g. "2 days ago">
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ COMPLETED (<n> phases)
  • Phase 1 – <title>
  • Phase 2 – <title> (partial: 3/5 tasks done)

🔄 IN PROGRESS
  • Phase 3 – <title>
    └─ Last task: <task title>

⏳ PENDING
  • Phase 4 – <title>
  • Phase 5 – <title>

📌 DECISIONS MADE
  • <key decision 1>
  • <key decision 2>

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Ready to continue from: <next task>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Status Report (on query)

Same as Session Resume but with more task-level detail for in-progress phases:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 STATUS: <ProjectName>
Updated: <timestamp>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ DONE
  Phase 1 – <title>        [5/5 tasks]
  Phase 2 – <title>        [5/5 tasks]

🔄 IN PROGRESS
  Phase 3 – <title>        [2/5 tasks]
    ✅ 3.1  <task>
    ✅ 3.2  <task>
    ⏳ 3.3  <task>   ← next up
    ⏳ 3.4  <task>
    ⏳ 3.5  <task>

⏳ PENDING
  Phase 4 – <title>        [0/4 tasks]
  Phase 5 – <title>        [0/3 tasks]

⚠️  BLOCKERS
  (none)

📌 RECENT DECISIONS
  <decision 1>
  <decision 2>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## State Update Rules

- **Mark a task complete** as soon as its code/output is verified working, not just written
- **Mark a phase complete** only when ALL tasks in it are done
- **Add a decision** whenever a significant architectural or design choice is made mid-session
- **Add a blocker** whenever something is blocking progress (remove it when resolved)
- **Session log** gets one entry per session (appended on first write of the session)
- Never delete history — only add and update

---

## Edge Cases

- **No CLAUDE.md found**: Ask the user to describe their phases, then build the state file from their description
- **State file corrupted**: Warn the user, offer to rebuild from CLAUDE.md
- **Phases added mid-project**: Append to the phases array with `pending` status
- **Task split mid-execution**: Add sub-tasks as additional entries, keep the parent

---

## File Operations (Claude Code bash)

### Read state
```bash
cat .phase-tracker/state.json
```

### Update state (use Python for safe JSON mutation)
```python
import json, datetime

with open('.phase-tracker/state.json', 'r') as f:
    state = json.load(f)

# Example: mark task 3.2 complete
for phase in state['phases']:
    if phase['id'] == '3':
        for task in phase['tasks']:
            if task['id'] == '3.2':
                task['status'] = 'completed'

state['last_updated'] = datetime.datetime.utcnow().isoformat() + 'Z'

with open('.phase-tracker/state.json', 'w') as f:
    json.dump(state, f, indent=2)
```

### Initialize from scratch
```bash
mkdir -p .phase-tracker
grep -n "Phase\|##\|###" CLAUDE.md | head -60  # scan structure
```

---

## Notes

- This skill is designed for Claude Code sessions, but the state file is portable — it can be read and updated in any environment with filesystem access
- The state file is intentionally human-readable JSON; users can inspect and edit it directly
- For very large projects (10+ phases, 50+ tasks), consider adding a `summary` field per phase to avoid scanning all tasks for the report