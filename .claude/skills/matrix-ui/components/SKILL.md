# Skill: Building or Editing a Component

## File structure (5 files per component)

```
packages/react/src/components/[Name]/
├── [Name].tsx           ← implementation
├── [Name].types.ts      ← prop interface + exported types
├── [Name].test.tsx      ← unit tests (React Testing Library)
├── [Name].stories.tsx   ← Storybook stories
└── index.ts             ← re-exports
```

## The 8 implementation rules

1. **Import tokens from `@matrixui/tokens`** — never hardcode values
   ```ts
   import { colors, spacing, textGlow, boxGlow, transitions } from '@matrixui/tokens'
   ```

2. **Inline styles only** — no CSS files, no CSS modules, no Tailwind
   (portability: consumers don't need any CSS import chain)

3. **Type all style objects as `React.CSSProperties`**

4. **5 interaction states**: default → hover → focus → active → disabled
   - Hover: `onMouseEnter`/`onMouseLeave` + `useState`
   - Focus: `onFocus`/`onBlur` + `useState`
   - Active: via `:active` CSS or `onMouseDown`/`onMouseUp`
   - Disabled: `opacity: 0.35`, `cursor: not-allowed`, no glow

5. **Export prop interface** from `[Name].types.ts`

6. **`React.forwardRef`** on all components rendering a native DOM element

7. **Zero TypeScript `any`** — use `unknown` and narrow, or proper generics

8. **`data-matrixui-[component]` attribute** on the root element:
   ```tsx
   <div data-matrixui-button>
   ```

## Build order (dependencies flow downward)

```
MatrixRain → Panel → Button, Input, Textarea, Avatar, Badge, Tag, Switch
→ DiffLine, CommitRow (uses Avatar) → Tooltip, ContextMenu
→ Toast, Modal (uses MatrixRain) → Titlebar (uses MatrixRain) → Sidebar (uses Panel)
```

## Adding a new component

```bash
mkdir packages/react/src/components/MyComponent
# Create: MyComponent.types.ts, MyComponent.tsx, MyComponent.test.tsx, MyComponent.stories.tsx, index.ts
# Add to packages/react/src/index.ts:
#   export * from './components/MyComponent'
```

## Running locally

```bash
pnpm storybook          # See component in browser
cd packages/react && pnpm test   # Run unit tests
cd packages/react && pnpm typecheck  # Check types
```
