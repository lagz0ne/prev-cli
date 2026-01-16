# prev-cli

**Zero-config documentation with live component previews.**

Write markdown. Embed React components. Ship.

```bash
npx prev-cli
```

---

## Why prev-cli?

Most documentation tools make you choose: **simple markdown** or **interactive examples**. prev-cli gives you both.

| Feature | Traditional Docs | prev-cli |
|---------|-----------------|----------|
| Setup | Config files, plugins, builds | `npx prev-cli` |
| Component demos | Screenshots or external links | Live, interactive previews |
| Dark mode | Add a library | Built-in |
| Navigation | Manual configuration | Auto-generated from folders |

---

## Live Previews

Embed interactive React components directly in your documentation:

```mdx
import { Preview } from '@prev/theme'

<Preview src="button-demo" />
```

The component runs in an isolated iframe with full React capabilities - state, hooks, effects, styling. No server-side bundling required.

[See the Button component →](/components/button)

---

## Getting Started

```bash
# Install
npm install -g prev-cli

# Create your first preview
prev create my-demo

# Start the dev server
prev
```

That's it. Your docs are live at `http://localhost:3000`.

[Full setup guide →](/getting-started)

---

## What's Included

- **MDX Support** - Write JSX in your markdown
- **Mermaid & D2 Diagrams** - Code blocks render as diagrams
- **Dark Mode** - System-aware with manual toggle
- **Hot Reloading** - See changes instantly
- **GitHub Pages Ready** - Static build for easy deployment

---

## Example: Design System Docs

This documentation site itself is built with prev-cli, showcasing a simple design system with live component examples.

[Explore the components →](/components)
