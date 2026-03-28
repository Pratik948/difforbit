import { useState } from "react"
import { Modal, Button, Input } from "@/components/ui"
import { colors, space, textGlow } from "@/styles/tokens"
import { checkGhAuth } from "@/ipc/github"
import { saveApiKey } from "@/ipc/engines"
import { useConfigStore } from "@/store/configStore"

const STEPS = [
  "Welcome",
  "How Reviews Work",
  "GitHub Setup",
  "AI Engine",
  "Add First Repo",
  "Tour & Shortcuts",
] as const

const SHORTCUTS = [
  { key: "j / k", action: "Navigate between PRs" },
  { key: "i", action: "Expand / collapse issue" },
  { key: "a", action: "Approve focused PR" },
  { key: "r", action: "Request changes" },
  { key: "p", action: "Post selected comments" },
  { key: "/", action: "Focus search bar" },
  { key: "Cmd+R", action: "Run Now" },
  { key: "?", action: "Show keyboard shortcuts" },
  { key: "Esc", action: "Close modal / collapse" },
]

const PROFILES = [
  "Generic", "React / TypeScript", "Flutter / Dart",
  "Swift", "Kotlin", "Java", "React Native", "C / C++",
]

const sectionHeading: React.CSSProperties = {
  color: colors.text.primary,
  fontFamily: "var(--font-display, system-ui, sans-serif)",
  fontSize: "15px",
  fontWeight: "600",
  textShadow: textGlow.greenPrimary,
  marginBottom: space["3"],
}

const bodyText: React.CSSProperties = {
  color: colors.text.secondary,
  fontFamily: "var(--font-body, system-ui, sans-serif)",
  fontSize: "13px",
  lineHeight: "1.6",
  marginBottom: space["2"],
}

const codeChip: React.CSSProperties = {
  fontFamily: "var(--font-code, monospace)",
  fontSize: "12px",
  background: colors.bg.elevated,
  border: `1px solid ${colors.border.default}`,
  borderRadius: "4px",
  padding: `1px ${space["2"]}`,
  color: colors.text.primary,
  display: "inline-block",
}

const pill: React.CSSProperties = {
  ...codeChip,
  margin: `${space["1"]} ${space["1"]} ${space["1"]} 0`,
}

const tableRow: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: `${space["2"]} ${space["3"]}`,
  borderBottom: `1px solid ${colors.border.default}`,
  fontFamily: "var(--font-body, system-ui, sans-serif)",
  fontSize: "13px",
}

// Step 1: Welcome
function StepWelcome() {
  return (
    <div>
      <p style={bodyText}>
        <strong style={{ color: colors.text.primary }}>DiffOrbit</strong> lives in your macOS menu bar and automatically
        reviews GitHub pull requests using AI — so you can stay on top of review requests without
        switching context.
      </p>
      <p style={bodyText}>Here's how the pipeline works:</p>
      <div style={{ display: "flex", flexDirection: "column", gap: space["2"], marginTop: space["3"] }}>
        {[
          ["1", "GitHub CLI", "Fetches PRs where you're a requested reviewer"],
          ["2", "AI Engine", "Sends each diff to your configured model for structured analysis"],
          ["3", "Structured Review", "Returns verdict, issues, severity, and suggested inline comments"],
          ["4", "Your Action", "Approve, request changes, or post comments — all from DiffOrbit"],
        ].map(([num, label, desc]) => (
          <div key={num} style={{ display: "flex", gap: space["3"], alignItems: "flex-start" }}>
            <span style={{ ...codeChip, minWidth: "1.6rem", textAlign: "center", flexShrink: 0 }}>{num}</span>
            <div>
              <span style={{ color: colors.text.primary, fontFamily: "var(--font-body, system-ui, sans-serif)", fontSize: "13px", fontWeight: "500" }}>
                {label}
              </span>
              <span style={{ ...bodyText, marginBottom: 0 }}> — {desc}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Step 2: How Reviews Work
function StepHowReviewsWork() {
  return (
    <div>
      <p style={bodyText}>Each AI review returns a <strong style={{ color: colors.text.primary }}>verdict</strong>, a list of <strong style={{ color: colors.text.primary }}>issues</strong>, and positive notes.</p>

      <h4 style={{ ...sectionHeading, fontSize: "13px", marginTop: space["3"] }}>Verdicts</h4>
      {[
        { v: "APPROVE", color: colors.status.synced, desc: "Code looks good — ready to merge" },
        { v: "REQUEST_CHANGES", color: colors.status.behind, desc: "Issues found that must be addressed" },
        { v: "NEEDS_DISCUSSION", color: colors.status.modified, desc: "Ambiguous — worth talking through" },
      ].map(({ v, color, desc }) => (
        <div key={v} style={{ display: "flex", alignItems: "center", gap: space["3"], marginBottom: space["2"] }}>
          <span style={{ ...codeChip, color, borderColor: color, minWidth: "9rem", textAlign: "center" }}>{v}</span>
          <span style={bodyText}>{desc}</span>
        </div>
      ))}

      <h4 style={{ ...sectionHeading, fontSize: "13px", marginTop: space["3"] }}>Issue Severity</h4>
      {[
        { s: "High", c: colors.status.behind },
        { s: "Medium", c: colors.status.modified },
        { s: "Low", c: colors.status.synced },
        { s: "NEEDS_VERIFICATION", c: colors.status.ahead },
      ].map(({ s, c }) => (
        <span key={s} style={{ ...pill, color: c, borderColor: c }}>{s}</span>
      ))}

      <p style={{ ...bodyText, marginTop: space["3"] }}>
        Each issue includes a suggested comment you can post directly
        to GitHub as an inline review comment. High and Medium issues are pre-selected by default.
      </p>
    </div>
  )
}

// Step 3: GitHub Setup
function StepGitHub() {
  const [status, setStatus] = useState<"idle" | "checking" | "ok" | "error">("idle")
  const [user, setUser] = useState("")

  async function check() {
    setStatus("checking")
    try {
      const u = await checkGhAuth()
      setUser(u)
      setStatus("ok")
    } catch {
      setStatus("error")
    }
  }

  return (
    <div>
      <p style={bodyText}>
        DiffOrbit uses the <span style={codeChip}>gh</span> CLI to fetch PR diffs and post comments.
        You must authenticate it before running your first review.
      </p>
      <div style={{
        background: colors.bg.elevated,
        border: `1px solid ${colors.border.default}`,
        borderRadius: "6px",
        padding: space["4"],
        fontFamily: "var(--font-code, monospace)",
        fontSize: "13px",
        color: colors.text.secondary,
        marginBottom: space["4"],
      }}>
        gh auth login
      </div>
      <Button variant="ghost" size="sm" onClick={check} loading={status === "checking"}>
        Check authentication status
      </Button>
      {status === "ok" && (
        <p style={{ color: colors.status.synced, fontFamily: "var(--font-body, system-ui, sans-serif)", fontSize: "13px", marginTop: space["2"] }}>
          Authenticated as <strong>{user}</strong>
        </p>
      )}
      {status === "error" && (
        <p style={{ color: colors.status.behind, fontFamily: "var(--font-body, system-ui, sans-serif)", fontSize: "13px", marginTop: space["2"] }}>
          Not authenticated. Run <span style={codeChip}>gh auth login</span> in your terminal, then check again.
        </p>
      )}
    </div>
  )
}

// Step 4: AI Engine
function StepAIEngine() {
  const { config } = useConfigStore()
  const [engine, setEngine] = useState(config?.engine.type ?? "anthropic")
  const [apiKey, setApiKey] = useState("")
  const [saved, setSaved] = useState(false)

  async function saveKey() {
    const service = engine === "anthropic" ? "difforbit.anthropic" : "difforbit.openai"
    await saveApiKey(service, apiKey)
    setSaved(true)
    setApiKey("")
  }

  return (
    <div>
      <p style={bodyText}>Choose the AI engine to power your reviews:</p>

      <div style={{ display: "flex", flexDirection: "column", gap: space["2"], marginBottom: space["4"] }}>
        {[
          { value: "anthropic", label: "Anthropic Claude", desc: "claude-opus-4-5 or claude-sonnet-4-6" },
          { value: "openai_compatible", label: "OpenAI-compatible", desc: "OpenAI, Groq, Ollama, Mistral, Together…" },
          { value: "claude_code", label: "Claude Code CLI", desc: "Uses your authenticated Claude Code session — no key needed" },
        ].map(({ value, label, desc }) => (
          <div
            key={value}
            onClick={() => setEngine(value as "anthropic" | "openai_compatible" | "claude_code")}
            style={{
              cursor: "pointer",
              padding: space["3"],
              border: `1px solid ${engine === value ? colors.status.synced : colors.border.default}`,
              borderRadius: "6px",
              background: engine === value ? `${colors.status.synced}11` : "transparent",
              transition: "border-color 0.15s ease",
            }}
          >
            <div style={{ color: engine === value ? colors.status.synced : colors.text.primary, fontFamily: "var(--font-body, system-ui, sans-serif)", fontSize: "13px", fontWeight: "500" }}>
              {label}
            </div>
            <div style={{ ...bodyText, marginBottom: 0, marginTop: space["1"] }}>{desc}</div>
          </div>
        ))}
      </div>

      {engine !== "claude_code" && (
        <div>
          <p style={{ ...bodyText, marginBottom: space["2"] }}>
            API key (stored securely in macOS Keychain — never written to disk):
          </p>
          <div style={{ display: "flex", gap: space["2"] }}>
            <Input
              value={apiKey}
              onChange={e => { setApiKey(e.target.value); setSaved(false) }}
              placeholder="sk-ant-..."
            />
            <Button variant="primary" size="sm" onClick={saveKey} loading={false}>
              Save
            </Button>
          </div>
          {saved && (
            <p style={{ color: colors.status.synced, fontFamily: "var(--font-body, system-ui, sans-serif)", fontSize: "13px", marginTop: space["1"] }}>
              Key saved to Keychain
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// Step 5: Add First Repo
function StepAddRepo() {
  const { config, saveConfig } = useConfigStore()
  const [owner, setOwner] = useState("")
  const [repo, setRepo] = useState("")
  const [added, setAdded] = useState(false)

  async function addRepo() {
    if (!owner || !repo || !config) return
    const defaultProfile = config.profiles[0]?.id ?? "generic"
    const newRepo = { owner, repo, profileId: defaultProfile, enabled: true }
    await saveConfig({ ...config, repos: [...config.repos, newRepo] })
    setAdded(true)
  }

  return (
    <div>
      <p style={bodyText}>
        Add a GitHub repository to watch. DiffOrbit will poll it for PRs where you're a requested reviewer.
      </p>
      <div style={{ display: "flex", gap: space["2"], marginBottom: space["2"] }}>
        <Input value={owner} onChange={e => setOwner(e.target.value)} placeholder="owner" />
        <span style={{ color: colors.text.tertiary, alignSelf: "center" }}>/</span>
        <Input value={repo} onChange={e => setRepo(e.target.value)} placeholder="repo" />
        <Button variant="primary" size="sm" onClick={addRepo}>Add</Button>
      </div>
      {added && (
        <p style={{ color: colors.status.synced, fontFamily: "var(--font-body, system-ui, sans-serif)", fontSize: "13px" }}>
          {owner}/{repo} added. You can add more repos in Configuration.
        </p>
      )}
      <p style={{ ...bodyText, marginTop: space["3"] }}>
        You can also skip this step and add repos from the <strong style={{ color: colors.text.primary }}>Configuration</strong> page.
      </p>

      <h4 style={{ ...sectionHeading, fontSize: "13px", marginTop: space["4"] }}>Built-in Review Profiles</h4>
      <div style={{ display: "flex", flexWrap: "wrap" as const }}>
        {PROFILES.map(p => <span key={p} style={pill}>{p}</span>)}
      </div>
      <p style={{ ...bodyText, marginTop: space["2"] }}>
        Each profile contains a tailored AI system prompt for that language or framework.
        You can create custom profiles in the <strong style={{ color: colors.text.primary }}>Profiles</strong> page.
      </p>
    </div>
  )
}

// Step 6: Tour & Shortcuts
function StepTour() {
  return (
    <div>
      <h4 style={{ ...sectionHeading, fontSize: "13px" }}>Keyboard Shortcuts</h4>
      <div style={{ border: `1px solid ${colors.border.default}`, borderRadius: "6px", overflow: "hidden", marginBottom: space["4"] }}>
        {SHORTCUTS.map(({ key, action }, i) => (
          <div key={key} style={{ ...tableRow, background: i % 2 === 0 ? colors.bg.surface : "transparent" }}>
            <span style={{ ...codeChip, minWidth: "6rem", textAlign: "center" }}>{key}</span>
            <span style={{ color: colors.text.secondary }}>{action}</span>
          </div>
        ))}
      </div>

      <h4 style={{ ...sectionHeading, fontSize: "13px" }}>Tips</h4>
      {[
        "Click the menu bar icon anytime to check the run status or trigger a review",
        "The scheduler can auto-run at a fixed time every day — set it in Configuration",
        "Re-review changed files by clicking Re-review on any PR card after new commits",
        "Large diffs are automatically truncated to fit AI context limits",
        "Press ? at any time to see these shortcuts",
      ].map((tip, i) => (
        <div key={i} style={{ display: "flex", gap: space["2"], marginBottom: space["2"] }}>
          <span style={{ color: colors.status.synced, flexShrink: 0 }}>•</span>
          <span style={bodyText}>{tip}</span>
        </div>
      ))}

      <div style={{
        marginTop: space["4"],
        padding: space["4"],
        border: `1px solid ${colors.border.default}`,
        borderRadius: "6px",
        background: colors.bg.elevated,
        textAlign: "center" as const,
      }}>
        <p style={{ ...sectionHeading, marginBottom: space["1"] }}>You're all set.</p>
        <p style={{ ...bodyText, marginBottom: 0 }}>Click Finish to open the Dashboard and run your first review.</p>
      </div>
    </div>
  )
}

// Wizard shell
export function OnboardingWizard({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0)
  const { config, saveConfig } = useConfigStore()

  async function finish() {
    if (config) {
      await saveConfig({ ...config, onboardingComplete: true })
    }
    onClose()
  }

  const stepComponents = [
    <StepWelcome key="welcome" />,
    <StepHowReviewsWork key="how" />,
    <StepGitHub key="gh" />,
    <StepAIEngine key="engine" />,
    <StepAddRepo key="repo" />,
    <StepTour key="tour" />,
  ]

  const isLast = step === STEPS.length - 1

  return (
    <Modal open onClose={onClose} title={`Setup — ${STEPS[step]}`} size="md">
      {/* Progress dots */}
      <div style={{ display: "flex", gap: space["2"], justifyContent: "center", marginBottom: space["4"] }}>
        {STEPS.map((_, i) => (
          <div
            key={i}
            onClick={() => i < step && setStep(i)}
            style={{
              width: "8px", height: "8px",
              borderRadius: "50%",
              background: i === step ? colors.border.active : i < step ? `${colors.border.active}66` : colors.border.default,
              cursor: i < step ? "pointer" : "default",
              transition: "background 0.2s",
            }}
          />
        ))}
      </div>

      {/* Step content */}
      <div style={{ minHeight: "280px" }}>
        {stepComponents[step]}
      </div>

      {/* Navigation */}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: space["6"] }}>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setStep(s => Math.max(0, s - 1))}
          {...(step === 0 ? { disabled: true } : {})}
        >
          Back
        </Button>
        <span style={{ color: colors.text.tertiary, fontFamily: "var(--font-body, system-ui, sans-serif)", fontSize: "12px", alignSelf: "center" }}>
          {step + 1} / {STEPS.length}
        </span>
        {isLast ? (
          <Button variant="primary" size="sm" onClick={finish}>Finish</Button>
        ) : (
          <Button variant="primary" size="sm" onClick={() => setStep(s => s + 1)}>Next</Button>
        )}
      </div>
    </Modal>
  )
}
