# Getting Started

Get a documentation site running in under a minute.

---

## 1. Install

```bash
npm install -g prev-cli
# or
bun install -g prev-cli
```

## 2. Create docs

Create a `docs/` folder with markdown files:

```bash
mkdir docs
echo "# Welcome" > docs/index.md
```

## 3. Run

```bash
prev
```

Open `http://localhost:3000`. Done.

---

## Adding Live Previews

The killer feature: embed interactive React components in your docs.

### Create a preview

```bash
prev create button-demo
```

This creates `previews/button-demo/App.tsx`:

```tsx
import React, { useState } from 'react'

export default function App() {
  const [count, setCount] = useState(0)

  return (
    <button onClick={() => setCount(c => c + 1)}>
      Clicked {count} times
    </button>
  )
}
```

### Embed in your docs

Create `docs/button.mdx`:

```mdx
# Button

<Preview src="button-demo" />
```

The component renders in an isolated iframe with full React capabilities.

---

## File Structure

```
your-project/
├── docs/
│   ├── index.md        → /
│   ├── getting-started.md → /getting-started
│   └── components/
│       └── button.mdx  → /components/button
└── previews/
    └── button-demo/
        └── App.tsx
```

- `docs/` - Your markdown files become pages
- `previews/` - React components for live demos
- Navigation is auto-generated from folder structure

---

## Building for Production

```bash
prev build
```

Outputs static HTML to `dist/`. Deploy anywhere - GitHub Pages, Netlify, Vercel.

---

## Configuration (Optional)

Create `.prev.yaml` for customization:

```yaml
theme: system          # light | dark | system
contentWidth: constrained  # constrained | full
hidden:
  - "drafts/**"        # Hide pages from nav
```

Most projects don't need configuration. The defaults work.

---

## Next Steps

- [Explore the component examples →](/components)
- [See the Button component →](/components/button)
