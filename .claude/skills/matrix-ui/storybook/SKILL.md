# Skill: Writing or Updating Storybook Stories

## 4 required stories per component

1. **Default** — minimal props, component at rest
2. **AllVariants** — one story showing all `variant` permutations side-by-side
3. **States** — hover, focused, disabled, loading (use render functions, not just args)
4. **All stories use the `matrix` dark background** (configured in preview.tsx)

## Story title convention

```ts
title: 'MatrixUI/ComponentName'
```

## Template

```tsx
import type { Meta, StoryObj } from '@storybook/react'
import { MyComponent } from './MyComponent'

const meta: Meta<typeof MyComponent> = {
  title: 'MatrixUI/MyComponent',
  component: MyComponent,
  parameters: {
    backgrounds: { default: 'matrix' },  // always include this
  },
  argTypes: {
    variant: { control: 'select', options: ['primary', 'ghost'] },
    size:    { control: 'select', options: ['sm', 'md', 'lg'] },
  },
}
export default meta
type Story = StoryObj<typeof MyComponent>

export const Default: Story = { args: { children: 'Label' } }
export const AllVariants: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '8px', padding: '20px' }}>
      <MyComponent variant="primary">Primary</MyComponent>
      <MyComponent variant="ghost">Ghost</MyComponent>
    </div>
  ),
}
```

## Important notes

- **Do NOT call `injectMatrixUITokens()` in stories** — it is already called in `.storybook/preview.tsx`
- Use `render: () => <...>` for multi-component demos
- Wrap interactive stories in a state controller component when needed:
  ```tsx
  function Demo() {
    const [val, setVal] = useState(false)
    return <Switch checked={val} onChange={setVal} />
  }
  export const Default: Story = { render: () => <Demo /> }
  ```
- Add `padding: '20px'` to story wrappers so components don't touch the viewport edge

## Running Storybook

```bash
pnpm storybook   # starts on http://localhost:6006
```
