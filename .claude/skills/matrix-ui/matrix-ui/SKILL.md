# MatrixUI — Claude Code Skill

Read this file at the start of any session involving MatrixUI components or tokens.
It gives you the mental model, critical constraints, and code patterns to work correctly
without having to re-read every source file.

---

## Package map

| Import from | When |
|-------------|------|
| `@matrixui/tokens` | Need a color, spacing, shadow, motion, or typography value |
| `@matrixui/react` | Need a UI component or hook |

```ts
import { colors, spacing, textGlow, boxGlow, transitions, rainPresets } from '@matrixui/tokens'
import { Button, Panel, MatrixRain, useToast } from '@matrixui/react'
```

---

## Critical constraints — never violate these

1. **No hardcoded hex colors or px values in components.** Always use tokens.
   ```ts
   // WRONG
   color: '#00ff41'
   padding: '8px'

   // RIGHT
   color: colors.text.primary
   padding: spacing.space[2]
   ```

2. **No CSS files, no CSS modules, no Tailwind.** Inline styles only, typed as `React.CSSProperties`.

3. **No TypeScript `any`.** Use `unknown` + narrowing, or proper generics.

4. **`injectMatrixUITokens()` is called once at app entry.** Never call it inside a component or story.

5. **`exactOptionalPropertyTypes: true` is on.** When forwarding optional props, use conditional spreading:
   ```ts
   // WRONG — fails when value is undefined
   <Comp className={className} />

   // RIGHT
   <Comp {...(className !== undefined ? { className } : {})} />
   ```

---

## Component quick-reference

### Layout / surfaces

| Component | Purpose | Key props |
|-----------|---------|-----------|
| `Panel` | Base surface — dark overlay over matrix rain | `rain`, `bgOpacity` (default 0.78), `children` |
| `Sidebar` | Left-nav panel with fixed header/footer, scrollable body | `header`, `footer`, `children` |
| `Titlebar` | App chrome (Tauri/Electron) — drag region + window controls | `appName`, `menuItems`, `onMinimize/Maximize/Close` |
| `MatrixRain` | Raw canvas animation — used inside Panel automatically | `preset`, `speed`, `opacity`, `headColor` |

### Primitives

| Component | Purpose | Key props |
|-----------|---------|-----------|
| `Button` | All clickable actions | `variant` (primary/ghost/danger/cyan), `size` (sm/md/lg), `loading` |
| `Input` | Single-line text | `variant` (green/cyan), `error` |
| `Textarea` | Multi-line text — never user-resizable | `variant` (green/cyan), `error` |
| `Switch` | Boolean toggle | `checked`, `onChange`, `label` |
| `Avatar` | User identity — initials or image | `name`, `src`, `size` (sm/md/lg) |

### Data display

| Component | Purpose | Key props |
|-----------|---------|-----------|
| `Badge` | Repo/branch status | `variant` (synced/ahead/behind/modified/count), `count` |
| `Tag` | Metadata chip | `variant` (lang/version/branch), `label`, `language` |
| `DiffLine` | Single diff row with gutter | `type` (added/removed/neutral), `content`, `lineNo` |
| `CommitRow` | Commit list item — Avatar + message + hash | `author`, `message`, `hash`, `time`, `fileCount`, `onClick` |

### Overlays / feedback

| Component | Purpose | Key props |
|-----------|---------|-----------|
| `Tooltip` | Hover hint wrapping any element | `content`, `children`, `placement` (top/bottom/left/right) |
| `ContextMenu` | Right-click menu via portal | `items`, `children` |
| `Modal` | Dialog with backdrop + focus trap | `open`, `onClose`, `title`, `size` (sm/md/lg) |
| `Toast` | Global notifications — max 3 visible | via `useToast()` hook inside `<ToastProvider>` |

---

## Patterns to know by heart

### App entry — always inject tokens first

```tsx
// main.tsx
import { injectMatrixUITokens } from '@matrixui/tokens'
injectMatrixUITokens()
// then render your app
```

### Toast — wrap once, use anywhere

```tsx
// Root
<ToastProvider><App /></ToastProvider>

// Anywhere inside
const { addToast } = useToast()
addToast({ variant: 'success', message: 'Pushed to origin/main' })
addToast({ variant: 'error',   message: 'Push failed', duration: 8000 })
```

### Async button with loading state

```tsx
const [loading, setLoading] = useState(false)
<Button loading={loading} onClick={async () => {
  setLoading(true)
  await push()
  setLoading(false)
}}>Push</Button>
```

### Form — Input + Textarea + Switch

```tsx
<Input  variant="green" error={!!err} value={v} onChange={e => setV(e.target.value)} />
<Textarea variant="green" rows={4}  value={body} onChange={e => setBody(e.target.value)} />
<Switch checked={amend} onChange={setAmend} label="Amend last commit" />
```

### Diff view

```tsx
<Panel rain={{ preset: 'diff' }}>
  <DiffLine type="removed" lineNo={10} content="- old line" />
  <DiffLine type="added"   lineNo={10} content="+ new line" />
  <DiffLine type="neutral" lineNo={11} content="  context"  />
</Panel>
```

### ContextMenu items shape

```ts
const items: ContextMenuItem[] = [
  { type: 'action',    label: 'Open',   onClick: () => {} },
  { type: 'separator' },
  { type: 'action',    label: 'Delete', danger: true, onClick: () => {} },
]
```

### Modal confirmation dialog

```tsx
<Modal open={open} onClose={() => setOpen(false)} title="Confirm" size="sm">
  <p>Are you sure?</p>
  <Button variant="danger" onClick={confirm}>Yes</Button>
  <Button variant="ghost"  onClick={() => setOpen(false)}>Cancel</Button>
</Modal>
```

### Using token values in custom styles

```tsx
const style: React.CSSProperties = {
  backgroundColor: colors.bg.surface,
  color:           colors.text.primary,
  border:          `1px solid ${colors.border.default}`,
  padding:         `${spacing.space[2]} ${spacing.space[4]}`,
  borderRadius:    spacing.radii.sm,
  textShadow:      textGlow.greenSoft,
  transition:      transitions.color,
}
```

---

## Token cheat sheet

### Colors most used in components

```ts
colors.bg.base        // #000000 — page background
colors.bg.surface     // #0a0a0a — cards, panels
colors.bg.elevated    // #111111 — hover, tooltips
colors.text.primary   // #e8ffe8 — headings
colors.text.secondary // #a0c8a0 — body
colors.text.tertiary  // #4a7a4a — timestamps, meta
colors.text.ghost     // #1a3a1a — gutters, placeholders
colors.border.default // #1a3a1a
colors.border.focus   // #00ff41
colors.status.synced  // #00ff41
colors.status.ahead   // #00d4ff
colors.status.behind  // #ff3a3a
colors.status.modified // #ffd700
colors.diff.added     // #003300
colors.diff.removed   // #1a0000
```

### Spacing

```ts
spacing.space[1]  // 4px
spacing.space[2]  // 8px
spacing.space[3]  // 12px
spacing.space[4]  // 16px
spacing.space[6]  // 24px
spacing.radii.sm  // 4px
spacing.radii.md  // 6px
```

### Shadows

```ts
textGlow.greenDefault  // heading glow
textGlow.greenSoft     // subtle label glow
textGlow.cyanDefault   // cyan variant glow
boxGlow.greenFocus     // focus ring — green inputs/buttons
boxGlow.cyanFocus      // focus ring — cyan inputs/buttons
boxGlow.dangerFocus    // focus ring — error state
```

### Rain presets (pass to `Panel` or `MatrixRain`)

```ts
'titlebar'    // fast, bright, dense
'sidebar'     // medium, narrow
'diff'        // slow, subtle — default
'modal'       // fast, dramatic
'history'     // medium
'statusBar'   // very fast, tiny font
```

---

## Hooks

### `useGlitch` — random CSS glitch trigger

```tsx
const { isGlitching } = useGlitch()
// isGlitching flips true briefly on a random interval
// Use it to drive filter/transform CSS effects
```

### `useMatrixRain` — drive your own canvas

```tsx
const ref = useRef<HTMLCanvasElement>(null)
useMatrixRain(ref, { preset: 'diff', headColor: '#00d4ff' })
// Handles animation loop, resize observer, and cleanup
```

---

## TypeScript — exported types

```ts
import type {
  ButtonProps, ButtonVariant, ButtonSize,
  InputProps, TextareaProps,
  AvatarProps, AvatarSize,
  BadgeProps, BadgeVariant,
  TagProps, TagVariant,
  SwitchProps,
  DiffLineProps, DiffLineType,
  CommitRowProps,
  TooltipProps, TooltipPlacement,
  ContextMenuProps, ContextMenuItem, ContextMenuItemType,
  ModalProps, ModalSize,
  ToastItem, ToastVariant, ToastProviderProps,
  TitlebarProps, TitlebarMenuItem,
  SidebarProps,
  PanelProps,
  MatrixRainProps,
} from '@matrixui/react'

import type { RainPreset } from '@matrixui/tokens'
```

---

## Dev commands

```bash
pnpm install                           # install all deps
pnpm --filter @matrixui/tokens build   # build tokens (required before typecheck)
pnpm typecheck                         # zero errors expected
pnpm lint                              # zero errors expected
pnpm build                             # build both packages
pnpm test                              # 76 tests, all pass
pnpm storybook                         # component explorer on :6006
```

---

## Where to look when something is wrong

| Problem | Look here |
|---------|-----------|
| Wrong color or spacing value | `packages/tokens/src/colors.ts` or `spacing.ts` |
| Component visual behavior | `docs/FIGMA_SPEC.md` Part 5 |
| Component implementation | `packages/react/src/components/[Name]/[Name].tsx` |
| Prop interface / types | `packages/react/src/components/[Name]/[Name].types.ts` |
| Token not found at runtime | Check `generateCSSVariables()` in the relevant token file |
| `@matrixui/tokens` not resolving in CI | Build tokens first: `pnpm --filter @matrixui/tokens build` |
| `exactOptionalPropertyTypes` error | Use conditional spreading — see constraints above |

---