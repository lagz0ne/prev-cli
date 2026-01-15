# Preview Prototypes Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enable embedding live Vite-powered prototype previews within documentation pages.

**Architecture:** Scan for `previews/*/index.html` directories, register them as Vite entry points via rollupOptions.input, serve them at `/_preview/*` routes, and provide a `<Preview>` component for iframe embedding in MDX.

**Tech Stack:** Vite multi-entry builds, React component, fast-glob

---

## Task 1: Create Preview Scanner

Scan for directories containing `index.html` under `previews/` folder.

**Files:**
- Create: `src/vite/previews.ts`
- Test: `src/vite/previews.test.ts`

**Step 1: Write the failing test**

```typescript
// src/vite/previews.test.ts
import { test, expect, beforeAll, afterAll } from 'bun:test'
import { mkdirSync, writeFileSync, rmSync } from 'fs'
import { join } from 'path'
import { scanPreviews } from './previews'

const testDir = '/tmp/prev-cli-test-previews'

beforeAll(() => {
  // Create test structure
  mkdirSync(join(testDir, 'previews/button'), { recursive: true })
  mkdirSync(join(testDir, 'previews/card/variants'), { recursive: true })
  writeFileSync(join(testDir, 'previews/button/index.html'), '<html></html>')
  writeFileSync(join(testDir, 'previews/card/index.html'), '<html></html>')
  writeFileSync(join(testDir, 'previews/card/variants/index.html'), '<html></html>')
  // This should NOT be picked up (no index.html)
  mkdirSync(join(testDir, 'previews/empty'), { recursive: true })
})

afterAll(() => {
  rmSync(testDir, { recursive: true, force: true })
})

test('scanPreviews finds directories with index.html', async () => {
  const previews = await scanPreviews(testDir)

  expect(previews).toHaveLength(3)
  expect(previews.map(p => p.name).sort()).toEqual(['button', 'card', 'card/variants'])
})

test('scanPreviews returns correct routes', async () => {
  const previews = await scanPreviews(testDir)

  const button = previews.find(p => p.name === 'button')
  expect(button?.route).toBe('/_preview/button')

  const nested = previews.find(p => p.name === 'card/variants')
  expect(nested?.route).toBe('/_preview/card/variants')
})

test('scanPreviews returns empty array when no previews folder', async () => {
  const previews = await scanPreviews('/tmp/nonexistent-dir')
  expect(previews).toEqual([])
})
```

**Step 2: Run test to verify it fails**

Run: `bun test src/vite/previews.test.ts`
Expected: FAIL with "Cannot find module './previews'"

**Step 3: Write minimal implementation**

```typescript
// src/vite/previews.ts
import fg from 'fast-glob'
import path from 'path'
import { existsSync } from 'fs'

export interface Preview {
  name: string
  route: string
  htmlPath: string
}

export async function scanPreviews(rootDir: string): Promise<Preview[]> {
  const previewsDir = path.join(rootDir, 'previews')

  if (!existsSync(previewsDir)) {
    return []
  }

  const htmlFiles = await fg.glob('**/index.html', {
    cwd: previewsDir,
    ignore: ['node_modules/**']
  })

  return htmlFiles.map(file => {
    const dir = path.dirname(file)
    const name = dir === '.' ? path.basename(path.dirname(path.join(previewsDir, file))) : dir

    return {
      name,
      route: `/_preview/${name}`,
      htmlPath: path.join(previewsDir, file)
    }
  })
}
```

**Step 4: Run test to verify it passes**

Run: `bun test src/vite/previews.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/vite/previews.ts src/vite/previews.test.ts
git commit -m "feat: add preview scanner for prototype directories"
```

---

## Task 2: Create Previews Virtual Module Plugin

Expose previews data to the frontend via virtual module.

**Files:**
- Create: `src/vite/plugins/previews-plugin.ts`
- Modify: `src/vite/config.ts`

**Step 1: Write the plugin**

```typescript
// src/vite/plugins/previews-plugin.ts
import type { Plugin } from 'vite'
import { scanPreviews } from '../previews'

const VIRTUAL_MODULE_ID = 'virtual:prev-previews'
const RESOLVED_VIRTUAL_MODULE_ID = '\0' + VIRTUAL_MODULE_ID

export function previewsPlugin(rootDir: string): Plugin {
  return {
    name: 'prev-previews',

    resolveId(id) {
      if (id === VIRTUAL_MODULE_ID) {
        return RESOLVED_VIRTUAL_MODULE_ID
      }
    },

    async load(id) {
      if (id === RESOLVED_VIRTUAL_MODULE_ID) {
        const previews = await scanPreviews(rootDir)
        return `export const previews = ${JSON.stringify(previews)};`
      }
    }
  }
}
```

**Step 2: Update Vite config to include plugin and multi-entry**

Modify `src/vite/config.ts` - add to plugins array:

```typescript
// Add import at top
import { previewsPlugin } from './plugins/previews-plugin'
import { scanPreviews } from './previews'

// Inside createViteConfig, after existing plugins:
previewsPlugin(rootDir),

// Modify build config to include preview HTML files as inputs
// Replace the build section with:
const previews = await scanPreviews(rootDir)
const previewInputs = Object.fromEntries(
  previews.map(p => [`_preview/${p.name}`, p.htmlPath])
)

// In the return object, update build:
build: {
  outDir: path.join(rootDir, 'dist'),
  reportCompressedSize: false,
  chunkSizeWarningLimit: 10000,
  rollupOptions: {
    input: {
      main: path.join(srcRoot, 'theme/index.html'),
      ...previewInputs
    }
  }
}
```

**Step 3: Run build to verify no errors**

Run: `bun run build`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add src/vite/plugins/previews-plugin.ts src/vite/config.ts
git commit -m "feat: add previews plugin and multi-entry build"
```

---

## Task 3: Create Preview Component

React component to embed previews as iframes.

**Files:**
- Create: `src/theme/Preview.tsx`

**Step 1: Write the component**

```typescript
// src/theme/Preview.tsx
import React, { useState } from 'react'
import { Maximize2, Minimize2, ExternalLink } from 'lucide-react'

interface PreviewProps {
  src: string
  height?: string | number
  title?: string
}

export function Preview({ src, height = 400, title }: PreviewProps) {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const previewUrl = `/_preview/${src}`
  const displayTitle = title || src

  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-white dark:bg-zinc-900">
        <div className="flex items-center justify-between p-2 border-b border-zinc-200 dark:border-zinc-700">
          <span className="text-sm font-medium">{displayTitle}</span>
          <div className="flex gap-2">
            <a
              href={previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded"
              title="Open in new tab"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
            <button
              onClick={() => setIsFullscreen(false)}
              className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded"
              title="Exit fullscreen"
            >
              <Minimize2 className="w-4 h-4" />
            </button>
          </div>
        </div>
        <iframe
          src={previewUrl}
          className="w-full h-[calc(100vh-49px)]"
          title={displayTitle}
        />
      </div>
    )
  }

  return (
    <div className="my-4 border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700">
        <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
          {displayTitle}
        </span>
        <div className="flex gap-1">
          <a
            href={previewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded"
            title="Open in new tab"
          >
            <ExternalLink className="w-4 h-4 text-zinc-500" />
          </a>
          <button
            onClick={() => setIsFullscreen(true)}
            className="p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded"
            title="Fullscreen"
          >
            <Maximize2 className="w-4 h-4 text-zinc-500" />
          </button>
        </div>
      </div>
      <iframe
        src={previewUrl}
        style={{ height: typeof height === 'number' ? `${height}px` : height }}
        className="w-full"
        title={displayTitle}
      />
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/theme/Preview.tsx
git commit -m "feat: add Preview component for iframe embedding"
```

---

## Task 4: Export Preview Component for MDX Usage

Make Preview component available in MDX files.

**Files:**
- Modify: `src/theme/entry.tsx`
- Create: `src/theme/mdx-components.tsx`

**Step 1: Create MDX components file**

```typescript
// src/theme/mdx-components.tsx
import { Preview } from './Preview'

export const mdxComponents = {
  Preview,
}
```

**Step 2: Update entry.tsx to use MDX provider**

In `src/theme/entry.tsx`, modify the MDX loading to include components:

```typescript
// Add import at top
import { mdxComponents } from './mdx-components'
import { MDXProvider } from '@mdx-js/react'

// Wrap the PageWrapper content with MDXProvider:
function PageWrapper({ Component, meta }: { Component: React.ComponentType; meta: PageMeta }) {
  useDiagrams()
  return (
    <MDXProvider components={mdxComponents}>
      {meta.frontmatter && Object.keys(meta.frontmatter).length > 0 && (
        <MetadataBlock frontmatter={meta.frontmatter} />
      )}
      <Component />
    </MDXProvider>
  )
}
```

**Step 3: Add @mdx-js/react dependency**

Run: `bun add @mdx-js/react`

**Step 4: Verify build**

Run: `bun run build`
Expected: Build succeeds

**Step 5: Commit**

```bash
git add src/theme/entry.tsx src/theme/mdx-components.tsx package.json bun.lockb
git commit -m "feat: export Preview component for MDX usage"
```

---

## Task 5: Add Preview Route Handling

Configure Vite dev server to serve preview routes.

**Files:**
- Modify: `src/vite/config.ts`

**Step 1: Add preview middleware for dev server**

In `src/vite/config.ts`, add a configureServer hook to the returned config:

```typescript
// Inside createViteConfig, add to the return object:
server: {
  // ... existing server config ...

  // Add middleware to handle preview routes
},

// Create a custom plugin for preview serving (add to plugins array):
{
  name: 'prev-preview-server',
  configureServer(server) {
    server.middlewares.use(async (req, res, next) => {
      if (req.url?.startsWith('/_preview/')) {
        const previewName = req.url.slice('/_preview/'.length).split('?')[0]
        const htmlPath = path.join(rootDir, 'previews', previewName, 'index.html')

        if (existsSync(htmlPath)) {
          const html = await server.transformIndexHtml(
            req.url,
            readFileSync(htmlPath, 'utf-8')
          )
          res.setHeader('Content-Type', 'text/html')
          res.end(html)
          return
        }
      }
      next()
    })
  }
}
```

**Step 2: Add fs imports**

```typescript
// Add to imports at top
import { existsSync, readFileSync } from 'fs'
```

**Step 3: Verify dev server works with previews**

Run: `bun run build && cd /tmp && mkdir test-prev && cd test-prev && mkdir -p previews/demo && echo '<html><body><h1>Demo</h1></body></html>' > previews/demo/index.html && echo '# Test' > index.md`

Then manually test: `prev dev` and visit `/_preview/demo`

**Step 4: Commit**

```bash
git add src/vite/config.ts
git commit -m "feat: add preview route handling in dev server"
```

---

## Task 6: Update Virtual Module Types

Add TypeScript declarations for the virtual module.

**Files:**
- Create: `src/vite/virtual-modules.d.ts`

**Step 1: Create type declarations**

```typescript
// src/vite/virtual-modules.d.ts
declare module 'virtual:prev-pages' {
  export interface Page {
    route: string
    title: string
    file: string
    description?: string
    frontmatter?: Record<string, unknown>
  }

  export interface SidebarItem {
    title: string
    route?: string
    children?: SidebarItem[]
  }

  export const pages: Page[]
  export const sidebar: SidebarItem[]
}

declare module 'virtual:prev-previews' {
  export interface Preview {
    name: string
    route: string
    htmlPath: string
  }

  export const previews: Preview[]
}
```

**Step 2: Commit**

```bash
git add src/vite/virtual-modules.d.ts
git commit -m "feat: add virtual module type declarations"
```

---

## Task 7: Integration Test

Create an integration test for the full preview flow.

**Files:**
- Create: `test/preview-integration.test.ts`

**Step 1: Write integration test**

```typescript
// test/preview-integration.test.ts
import { test, expect, beforeAll, afterAll } from 'bun:test'
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'fs'
import { join } from 'path'
import { execSync } from 'child_process'

const testDir = '/tmp/prev-cli-preview-integration'

beforeAll(() => {
  // Create test project
  mkdirSync(testDir, { recursive: true })

  // Create index.md
  writeFileSync(join(testDir, 'index.md'), `# Home

Check out the preview:

<Preview src="demo" />
`)

  // Create preview
  mkdirSync(join(testDir, 'previews/demo'), { recursive: true })
  writeFileSync(join(testDir, 'previews/demo/index.html'), `<!DOCTYPE html>
<html>
<head><title>Demo Preview</title></head>
<body><h1>Demo Component</h1></body>
</html>
`)
})

afterAll(() => {
  rmSync(testDir, { recursive: true, force: true })
})

test('build includes preview files', () => {
  // Run build
  execSync(`bun run build`, { cwd: testDir, stdio: 'pipe' })

  // Check output exists
  expect(existsSync(join(testDir, 'dist'))).toBe(true)
  expect(existsSync(join(testDir, 'dist/_preview/demo/index.html'))).toBe(true)
})
```

**Step 2: Run integration test**

Run: `bun test test/preview-integration.test.ts`
Expected: PASS

**Step 3: Commit**

```bash
git add test/preview-integration.test.ts
git commit -m "test: add preview integration test"
```

---

## Task 8: Documentation

Add preview documentation to the project.

**Files:**
- Modify: `README.md` (if it exists)

**Step 1: Add preview documentation section**

Add to README or create example docs:

```markdown
## Preview Prototypes

Embed live Vite-powered prototypes in your documentation.

### Setup

1. Create a `previews/` folder in your docs root
2. Add subdirectories with `index.html` files:

```
docs/
├── previews/
│   ├── button/
│   │   └── index.html
│   └── card/
│       └── index.html
├── index.md
└── components.md
```

### Usage in MDX

```mdx
# Button Component

Here's a live preview:

<Preview src="button" />

With custom height:

<Preview src="button" height={600} title="Button Demo" />
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| src | string | required | Preview directory name |
| height | string \| number | 400 | Iframe height |
| title | string | src value | Display title |
```

**Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add preview prototypes documentation"
```

---

## Summary

This plan creates embedded Vite prototype previews with:

1. **Scanner** (`src/vite/previews.ts`) - Finds `previews/*/index.html` directories
2. **Plugin** (`src/vite/plugins/previews-plugin.ts`) - Exposes previews via virtual module
3. **Component** (`src/theme/Preview.tsx`) - Iframe embed with fullscreen support
4. **MDX Integration** - Available as `<Preview src="name" />` in docs
5. **Route Handling** - Serves previews at `/_preview/*` routes
6. **Multi-entry Build** - Includes preview HTML in production builds
