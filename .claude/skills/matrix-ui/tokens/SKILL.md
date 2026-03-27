# Skill: Adding or Modifying Design Tokens

## The 3-layer model

```
Layer 1: Raw palette (colors.ts)
  e.g. palette.green[100] = '#00ff41'

Layer 2: Semantic tokens (colors.ts — the `colors` object)
  e.g. colors.text.primary = palette.green[100]
  Components ONLY import from layer 2 — never layer 1.

Layer 3: CSS variables (generateCSSVariables() in each token file)
  e.g. --mx-text-primary: #00ff41
  Injected into :root via injectMatrixUITokens()
```

## Where each token type lives

| Token type | File |
|-----------|------|
| Colors (palette + semantic) | `packages/tokens/src/colors.ts` |
| Typography | `packages/tokens/src/typography.ts` |
| Spacing | `packages/tokens/src/spacing.ts` |
| Motion (duration, easing, transitions, rainPresets, glitch) | `packages/tokens/src/motion.ts` |
| Shadows & glows (textGlow, boxGlow, crtEffects) | `packages/tokens/src/shadows.ts` |
| Borders (radius, width) | `packages/tokens/src/borders.ts` |
| Z-index | `packages/tokens/src/zIndex.ts` |
| Entry + CSS injection | `packages/tokens/src/index.ts` |

## The golden rule

**Never hardcode a hex color or px value in a component.** Always:
1. Add the value to the appropriate token file
2. Add it to the semantic layer
3. Add it to the `generateCSSVariables()` function in the same file
4. Then import and use it in the component

## Adding a new color token

```ts
// 1. In colors.ts — add to raw palette if new shade:
export const palette = {
  green: { ..., 125: '#22ff55' }
}

// 2. Add to semantic layer:
export const colors = {
  text: { ..., brightPrimary: palette.green[125] }
}

// 3. Add to generateCSSVariables():
export function generateCSSVariables(): string {
  return `
    ...
    --mx-text-bright-primary: ${colors.text.brightPrimary};
  `
}
```

## Common mistakes

- Adding a color to `colors.ts` but forgetting to add it to `generateCSSVariables()` — the CSS variable won't exist
- Using `palette.*` directly in components — always use `colors.*` instead
- Modifying `docs/seed/` files — those are read-only reference. Edit `packages/tokens/src/` instead

## Verifying your changes

```bash
cd packages/tokens && pnpm build
# Check dist/index.d.ts to confirm your export is included
```

## CSS variable injection

`injectMatrixUITokens()` in `packages/tokens/src/index.ts` injects all tokens into `:root` as CSS variables.
It is called once in `.storybook/preview.tsx` — do not call it again in components or stories.
