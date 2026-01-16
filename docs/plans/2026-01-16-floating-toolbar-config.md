# Floating Toolbar & Config System Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the current sidebar navigation with a floating draggable toolbar and add `.prev.yaml` configuration support.

**Architecture:** Remove the 260px sidebar entirely. Introduce a floating pill-shaped toolbar with TOC, Previews, contextual devtools, theme toggle, and width toggle. Configuration is read from `.prev.yaml` in project root, with auto-save for drag ordering.

**Tech Stack:** React 19, TypeScript, Vite, YAML parsing (js-yaml), picomatch for glob patterns.

---

## Task 1: Add YAML Config Dependencies

**Files:**
- Modify: `package.json`

**Step 1: Install js-yaml and picomatch**

```bash
bun add js-yaml picomatch
bun add -d @types/js-yaml @types/picomatch
```

**Step 2: Verify installation**

Run: `bun install`
Expected: Dependencies installed successfully

**Step 3: Commit**

```bash
git add package.json bun.lock
git commit -m "chore: add js-yaml and picomatch dependencies"
```

---

## Task 2: Create Config Schema & Loader

**Files:**
- Create: `src/config/schema.ts`
- Create: `src/config/loader.ts`
- Create: `src/config/index.ts`

**Step 1: Write the config schema types**

Create `src/config/schema.ts`:

```typescript
export interface PrevConfig {
  theme: 'light' | 'dark' | 'system'
  contentWidth: 'constrained' | 'full'
  hidden: string[]
  order: Record<string, string[]>
}

export const defaultConfig: PrevConfig = {
  theme: 'system',
  contentWidth: 'constrained',
  hidden: [],
  order: {}
}

export function validateConfig(raw: unknown): PrevConfig {
  const config = { ...defaultConfig }

  if (raw && typeof raw === 'object') {
    const obj = raw as Record<string, unknown>

    if (obj.theme === 'light' || obj.theme === 'dark' || obj.theme === 'system') {
      config.theme = obj.theme
    }

    if (obj.contentWidth === 'constrained' || obj.contentWidth === 'full') {
      config.contentWidth = obj.contentWidth
    }

    if (Array.isArray(obj.hidden)) {
      config.hidden = obj.hidden.filter((h): h is string => typeof h === 'string')
    }

    if (obj.order && typeof obj.order === 'object') {
      config.order = {}
      for (const [key, value] of Object.entries(obj.order)) {
        if (Array.isArray(value)) {
          config.order[key] = value.filter((v): v is string => typeof v === 'string')
        }
      }
    }
  }

  return config
}
```

**Step 2: Write the config loader**

Create `src/config/loader.ts`:

```typescript
import { readFileSync, existsSync, writeFileSync } from 'fs'
import path from 'path'
import yaml from 'js-yaml'
import type { PrevConfig } from './schema'
import { defaultConfig, validateConfig } from './schema'

export function findConfigFile(rootDir: string): string | null {
  const yamlPath = path.join(rootDir, '.prev.yaml')
  const ymlPath = path.join(rootDir, '.prev.yml')

  if (existsSync(yamlPath)) return yamlPath
  if (existsSync(ymlPath)) return ymlPath
  return null
}

export function loadConfig(rootDir: string): PrevConfig {
  const configPath = findConfigFile(rootDir)

  if (!configPath) {
    return defaultConfig
  }

  try {
    const content = readFileSync(configPath, 'utf-8')
    const raw = yaml.load(content)
    return validateConfig(raw)
  } catch (error) {
    console.warn(`Warning: Failed to parse ${configPath}:`, error)
    return defaultConfig
  }
}

export function saveConfig(rootDir: string, config: PrevConfig): void {
  const configPath = findConfigFile(rootDir) || path.join(rootDir, '.prev.yaml')
  const content = yaml.dump(config, {
    indent: 2,
    lineWidth: -1,
    quotingType: '"',
    forceQuotes: false
  })
  writeFileSync(configPath, content, 'utf-8')
}

export function updateOrder(rootDir: string, pathKey: string, order: string[]): void {
  const config = loadConfig(rootDir)
  config.order[pathKey] = order
  saveConfig(rootDir, config)
}
```

**Step 3: Create index export**

Create `src/config/index.ts`:

```typescript
export { type PrevConfig, defaultConfig, validateConfig } from './schema'
export { loadConfig, saveConfig, updateOrder, findConfigFile } from './loader'
```

**Step 4: Test config loading manually**

Run: `echo "theme: dark" > /tmp/test-prev/.prev.yaml && bun -e "import { loadConfig } from './src/config'; console.log(loadConfig('/tmp/test-prev'))"`

Expected: `{ theme: 'dark', contentWidth: 'constrained', hidden: [], order: {} }`

**Step 5: Commit**

```bash
git add src/config/
git commit -m "feat: add config schema and loader for .prev.yaml"
```

---

## Task 3: Add Hidden Items Filtering

**Files:**
- Modify: `src/vite/pages.ts:117-199`
- Modify: `src/config/schema.ts` (add frontmatter hidden support)

**Step 1: Update Page interface to include hidden flag**

In `src/vite/pages.ts`, update the Page interface around line 12:

```typescript
export interface Page {
  route: string
  title: string
  file: string
  description?: string
  frontmatter?: Frontmatter
  hidden?: boolean  // Add this
}
```

**Step 2: Add hidden filtering to scanPages**

In `src/vite/pages.ts`, modify the `scanPages` function to accept config and filter hidden items. Add import at top:

```typescript
import picomatch from 'picomatch'
```

Update the function signature and add filtering logic around line 173-198:

```typescript
export interface ScanOptions {
  include?: string[]
  hidden?: string[]  // Add glob patterns from config
}

// Inside scanPages, after creating the page object (around line 195):
    // Check if page is hidden via frontmatter
    if (frontmatter.hidden === true) {
      page.hidden = true
    }

    pages.push(page)
  }

  // Filter out hidden pages for navigation (but keep them accessible by URL)
  return pages.sort((a, b) => a.route.localeCompare(b.route))
}

// Add new function to filter visible pages for navigation
export function filterVisiblePages(pages: Page[], hiddenPatterns: string[]): Page[] {
  if (hiddenPatterns.length === 0) {
    return pages.filter(p => !p.hidden)
  }

  const isMatch = picomatch(hiddenPatterns)

  return pages.filter(page => {
    if (page.hidden) return false
    return !isMatch(page.file)
  })
}
```

**Step 3: Test hidden filtering**

Run: `bun test src/vite/pages.test.ts` (create test if needed)
Expected: Tests pass

**Step 4: Commit**

```bash
git add src/vite/pages.ts
git commit -m "feat: add hidden page filtering via config and frontmatter"
```

---

## Task 4: Create Virtual Module for Config

**Files:**
- Modify: `src/vite/plugins/pages-plugin.ts`
- Create: `src/vite/plugins/config-plugin.ts`

**Step 1: Create config virtual module plugin**

Create `src/vite/plugins/config-plugin.ts`:

```typescript
import type { Plugin } from 'vite'
import type { PrevConfig } from '../../config'

const VIRTUAL_CONFIG_ID = 'virtual:prev-config'
const RESOLVED_CONFIG_ID = '\0' + VIRTUAL_CONFIG_ID

export function createConfigPlugin(config: PrevConfig): Plugin {
  return {
    name: 'prev-config',

    resolveId(id) {
      if (id === VIRTUAL_CONFIG_ID) {
        return RESOLVED_CONFIG_ID
      }
    },

    load(id) {
      if (id === RESOLVED_CONFIG_ID) {
        return `export const config = ${JSON.stringify(config)};`
      }
    }
  }
}
```

**Step 2: Add type declarations**

In `src/types/virtual.d.ts`, add:

```typescript
declare module 'virtual:prev-config' {
  import type { PrevConfig } from '../config'
  export const config: PrevConfig
}
```

**Step 3: Integrate plugin into Vite config**

In `src/vite/config.ts`, import and use the plugin (add to plugins array).

**Step 4: Commit**

```bash
git add src/vite/plugins/config-plugin.ts src/types/virtual.d.ts src/vite/config.ts
git commit -m "feat: add virtual:prev-config module for theme components"
```

---

## Task 5: Create Config API Endpoint

**Files:**
- Modify: `src/vite/config.ts`

**Step 1: Add middleware for config updates**

In the Vite config, add a configureServer hook to handle `POST /__prev/config`:

```typescript
// Inside createViteConfig, add to the returned config:
server: {
  // ... existing options
},
configureServer(server) {
  server.middlewares.use('/__prev/config', async (req, res) => {
    if (req.method === 'POST') {
      let body = ''
      req.on('data', chunk => { body += chunk })
      req.on('end', () => {
        try {
          const { path: pathKey, order } = JSON.parse(body)
          updateOrder(rootDir, pathKey, order)
          res.statusCode = 200
          res.end(JSON.stringify({ success: true }))
        } catch (e) {
          res.statusCode = 400
          res.end(JSON.stringify({ error: String(e) }))
        }
      })
      return
    }
    res.statusCode = 405
    res.end()
  })
}
```

**Step 2: Test the endpoint**

Run dev server, then:
```bash
curl -X POST http://localhost:PORT/__prev/config -H "Content-Type: application/json" -d '{"path":"/","order":["test.md"]}'
```
Expected: `{"success":true}` and `.prev.yaml` updated

**Step 3: Commit**

```bash
git add src/vite/config.ts
git commit -m "feat: add API endpoint for auto-saving config"
```

---

## Task 6: Create Floating Toolbar Component

**Files:**
- Create: `src/theme/Toolbar.tsx`
- Create: `src/theme/Toolbar.css`

**Step 1: Create the toolbar component**

Create `src/theme/Toolbar.tsx`:

```typescript
import React, { useState, useRef, useEffect } from 'react'
import { Link, useLocation } from '@tanstack/react-router'
import { config } from 'virtual:prev-config'
import { previews } from 'virtual:prev-previews'
import './Toolbar.css'

interface ToolbarProps {
  tree: PageTree.Root
  onThemeToggle: () => void
  onWidthToggle: () => void
  isDark: boolean
  isFullWidth: boolean
}

export function Toolbar({ tree, onThemeToggle, onWidthToggle, isDark, isFullWidth }: ToolbarProps) {
  const [tocOpen, setTocOpen] = useState(false)
  const [position, setPosition] = useState({ x: 20, y: window.innerHeight - 80 })
  const [dragging, setDragging] = useState(false)
  const dragStart = useRef({ x: 0, y: 0 })
  const toolbarRef = useRef<HTMLDivElement>(null)

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return
    setDragging(true)
    dragStart.current = { x: e.clientX - position.x, y: e.clientY - position.y }
  }

  useEffect(() => {
    if (!dragging) return

    const handleMouseMove = (e: MouseEvent) => {
      setPosition({
        x: Math.max(0, Math.min(window.innerWidth - 300, e.clientX - dragStart.current.x)),
        y: Math.max(0, Math.min(window.innerHeight - 60, e.clientY - dragStart.current.y))
      })
    }

    const handleMouseUp = () => setDragging(false)

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [dragging])

  return (
    <>
      <div
        ref={toolbarRef}
        className="prev-toolbar"
        style={{ left: position.x, top: position.y }}
        onMouseDown={handleMouseDown}
      >
        <button
          className="toolbar-btn"
          onClick={() => setTocOpen(!tocOpen)}
          title="Table of Contents"
        >
          <TocIcon />
        </button>

        {previews && previews.length > 0 && (
          <Link to="/previews" className="toolbar-btn" title="Previews">
            <PreviewsIcon />
          </Link>
        )}

        {/* Contextual devtools slot - populated by preview context */}
        <div className="toolbar-devtools-slot" id="toolbar-devtools" />

        <button
          className="toolbar-btn desktop-only"
          onClick={onWidthToggle}
          title={isFullWidth ? 'Constrain width' : 'Full width'}
        >
          {isFullWidth ? <ConstrainIcon /> : <ExpandIcon />}
        </button>

        <button
          className="toolbar-btn"
          onClick={onThemeToggle}
          title={isDark ? 'Light mode' : 'Dark mode'}
        >
          {isDark ? <SunIcon /> : <MoonIcon />}
        </button>
      </div>

      {tocOpen && (
        <TOCPanel
          tree={tree}
          onClose={() => setTocOpen(false)}
        />
      )}
    </>
  )
}

// Icon components (simplified SVGs)
function TocIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 12h18M3 6h18M3 18h18" />
    </svg>
  )
}

function PreviewsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
    </svg>
  )
}

function SunIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="5"/>
      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
    </svg>
  )
}

function ExpandIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>
    </svg>
  )
}

function ConstrainIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3"/>
    </svg>
  )
}
```

**Step 2: Create toolbar styles**

Create `src/theme/Toolbar.css`:

```css
.prev-toolbar {
  position: fixed;
  z-index: 9999;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.375rem;
  background: var(--fd-background);
  border: 1px solid var(--fd-border);
  border-radius: 9999px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  cursor: grab;
  user-select: none;
}

.prev-toolbar:active {
  cursor: grabbing;
}

.toolbar-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background: transparent;
  border: none;
  border-radius: 50%;
  color: var(--fd-muted-foreground);
  cursor: pointer;
  transition: all 0.15s ease;
  text-decoration: none;
}

.toolbar-btn:hover {
  background: var(--fd-muted);
  color: var(--fd-foreground);
}

.toolbar-devtools-slot {
  display: contents;
}

.toolbar-devtools-slot:empty {
  display: none;
}

/* Hide width toggle on mobile */
@media (max-width: 768px) {
  .toolbar-btn.desktop-only {
    display: none;
  }
}
```

**Step 3: Commit**

```bash
git add src/theme/Toolbar.tsx src/theme/Toolbar.css
git commit -m "feat: create floating draggable toolbar component"
```

---

## Task 7: Create TOC Panel Component

**Files:**
- Create: `src/theme/TOCPanel.tsx`
- Create: `src/theme/TOCPanel.css`

**Step 1: Create TOC panel component**

Create `src/theme/TOCPanel.tsx`:

```typescript
import React, { useState, useEffect, useRef } from 'react'
import { Link, useLocation } from '@tanstack/react-router'
import type { PageTree } from 'fumadocs-core/server'

interface TOCPanelProps {
  tree: PageTree.Root
  onClose: () => void
}

type TreeItem = PageTree.Item | PageTree.Folder

function getItemId(item: TreeItem): string {
  return item.type === 'folder' ? `folder:${item.name}` : item.url
}

export function TOCPanel({ tree, onClose }: TOCPanelProps) {
  const location = useLocation()
  const panelRef = useRef<HTMLDivElement>(null)
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768)
  const [orderedItems, setOrderedItems] = useState<TreeItem[]>(tree.children)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [onClose])

  const handleDragStart = (index: number) => {
    setDragIndex(index)
  }

  const handleDragOver = (index: number) => {
    if (dragIndex !== null && dragIndex !== index) {
      setDragOverIndex(index)
    }
  }

  const handleDragEnd = async () => {
    if (dragIndex !== null && dragOverIndex !== null && dragIndex !== dragOverIndex) {
      const newItems = [...orderedItems]
      const [removed] = newItems.splice(dragIndex, 1)
      newItems.splice(dragOverIndex, 0, removed)
      setOrderedItems(newItems)

      // Auto-save to config
      const order = newItems.map(item =>
        item.type === 'folder' ? `${item.name}/` : item.url.replace(/^\//, '') + '.md'
      )

      await fetch('/__prev/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: '/', order })
      })
    }
    setDragIndex(null)
    setDragOverIndex(null)
  }

  if (isMobile) {
    return (
      <div className="toc-overlay">
        <div className="toc-overlay-content" ref={panelRef}>
          <div className="toc-overlay-header">
            <span>Navigation</span>
            <button className="toc-close-btn" onClick={onClose}>×</button>
          </div>
          <nav className="toc-nav">
            {orderedItems.map((item, i) => (
              <TOCItem
                key={getItemId(item)}
                item={item}
                location={location}
                onNavigate={onClose}
              />
            ))}
          </nav>
        </div>
      </div>
    )
  }

  return (
    <div className="toc-dropdown" ref={panelRef}>
      <div className="toc-dropdown-header">
        <span>Navigation</span>
        <button className="toc-close-btn" onClick={onClose}>×</button>
      </div>
      <nav className="toc-nav">
        {orderedItems.map((item, i) => (
          <div
            key={getItemId(item)}
            draggable
            onDragStart={() => handleDragStart(i)}
            onDragOver={(e) => { e.preventDefault(); handleDragOver(i) }}
            onDragEnd={handleDragEnd}
            className={dragOverIndex === i ? 'drop-target' : ''}
          >
            <TOCItem
              item={item}
              location={location}
              onNavigate={onClose}
            />
          </div>
        ))}
      </nav>
    </div>
  )
}

interface TOCItemProps {
  item: TreeItem
  location: { pathname: string }
  onNavigate: () => void
  depth?: number
}

function TOCItem({ item, location, onNavigate, depth = 0 }: TOCItemProps) {
  const [isOpen, setIsOpen] = useState(true)

  if (item.type === 'folder') {
    return (
      <div className="toc-folder">
        <button
          className="toc-folder-toggle"
          onClick={() => setIsOpen(!isOpen)}
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
        >
          <span className={`folder-chevron ${isOpen ? 'open' : ''}`}>›</span>
          {item.name}
        </button>
        {isOpen && (
          <div className="toc-folder-children">
            {item.children.map((child) => (
              <TOCItem
                key={getItemId(child)}
                item={child}
                location={location}
                onNavigate={onNavigate}
                depth={depth + 1}
              />
            ))}
          </div>
        )}
      </div>
    )
  }

  const isActive = location.pathname === item.url

  return (
    <Link
      to={item.url}
      className={`toc-link ${isActive ? 'active' : ''}`}
      style={{ paddingLeft: `${depth * 12 + 12}px` }}
      onClick={onNavigate}
    >
      {item.name}
    </Link>
  )
}
```

**Step 2: Create TOC panel styles**

Create `src/theme/TOCPanel.css`:

```css
/* Desktop dropdown */
.toc-dropdown {
  position: fixed;
  left: 20px;
  bottom: 80px;
  width: 280px;
  max-height: 400px;
  background: var(--fd-background);
  border: 1px solid var(--fd-border);
  border-radius: 0.75rem;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  overflow: hidden;
  z-index: 9998;
}

.toc-dropdown-header,
.toc-overlay-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--fd-border);
  font-weight: 600;
  color: var(--fd-foreground);
}

.toc-close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  background: var(--fd-muted);
  border: none;
  border-radius: 50%;
  font-size: 1.25rem;
  color: var(--fd-muted-foreground);
  cursor: pointer;
}

.toc-close-btn:hover {
  background: var(--fd-accent);
  color: var(--fd-foreground);
}

.toc-nav {
  padding: 0.5rem;
  overflow-y: auto;
  max-height: 340px;
}

.toc-link {
  display: block;
  padding: 0.5rem 0.75rem;
  color: var(--fd-muted-foreground);
  text-decoration: none;
  font-size: 0.9rem;
  border-radius: 0.375rem;
  transition: all 0.15s ease;
}

.toc-link:hover {
  background: var(--fd-muted);
  color: var(--fd-foreground);
}

.toc-link.active {
  background: var(--fd-accent);
  color: var(--fd-accent-foreground);
  font-weight: 500;
}

.toc-folder-toggle {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.5rem 0.75rem;
  background: none;
  border: none;
  color: var(--fd-foreground);
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  border-radius: 0.375rem;
  text-align: left;
}

.toc-folder-toggle:hover {
  background: var(--fd-muted);
}

.folder-chevron {
  display: inline-block;
  transition: transform 0.15s ease;
}

.folder-chevron.open {
  transform: rotate(90deg);
}

.toc-folder-children {
  margin-left: 0.5rem;
}

.drop-target {
  background: var(--fd-accent);
  border-radius: 0.375rem;
}

/* Mobile full-screen overlay */
.toc-overlay {
  position: fixed;
  inset: 0;
  z-index: 9998;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
}

.toc-overlay-content {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  max-height: 80vh;
  background: var(--fd-background);
  border-radius: 1rem 1rem 0 0;
  overflow: hidden;
}

.toc-overlay-content .toc-nav {
  max-height: calc(80vh - 60px);
  padding: 1rem;
}

@media (max-width: 768px) {
  .toc-dropdown {
    display: none;
  }
}

@media (min-width: 769px) {
  .toc-overlay {
    display: none;
  }
}
```

**Step 3: Commit**

```bash
git add src/theme/TOCPanel.tsx src/theme/TOCPanel.css
git commit -m "feat: create TOC panel with drag-to-reorder"
```

---

## Task 8: Refactor Layout to Use Toolbar

**Files:**
- Modify: `src/theme/Layout.tsx`
- Modify: `src/theme/styles.css`

**Step 1: Remove old sidebar code from Layout.tsx**

Replace the entire Layout component with a simplified version that uses the Toolbar:

```typescript
import React, { useState, useEffect } from 'react'
import type { PageTree } from 'fumadocs-core/server'
import { config } from 'virtual:prev-config'
import { Toolbar } from './Toolbar'
import './Toolbar.css'
import './TOCPanel.css'

interface LayoutProps {
  tree: PageTree.Root
  children: React.ReactNode
}

export function Layout({ tree, children }: LayoutProps) {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window === 'undefined') return false
    if (config.theme === 'dark') return true
    if (config.theme === 'light') return false
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  const [isFullWidth, setIsFullWidth] = useState(() => {
    return config.contentWidth === 'full'
  })

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark)
  }, [isDark])

  useEffect(() => {
    document.documentElement.classList.toggle('full-width', isFullWidth)
  }, [isFullWidth])

  const handleThemeToggle = () => setIsDark(!isDark)
  const handleWidthToggle = () => setIsFullWidth(!isFullWidth)

  return (
    <div className="prev-layout-floating">
      <Toolbar
        tree={tree}
        onThemeToggle={handleThemeToggle}
        onWidthToggle={handleWidthToggle}
        isDark={isDark}
        isFullWidth={isFullWidth}
      />
      <main className="prev-main-floating">
        {children}
      </main>
    </div>
  )
}
```

**Step 2: Update styles.css**

Remove all old sidebar styles (lines ~24-175) and add:

```css
/* Floating layout - no sidebar */
.prev-layout-floating {
  min-height: 100vh;
}

.prev-main-floating {
  padding: 2rem;
  max-width: 100%;
}

.prev-main-floating .prev-content {
  max-width: 72ch;
  margin: 0 auto;
}

.full-width .prev-main-floating .prev-content {
  max-width: none;
}
```

**Step 3: Test the new layout**

Run: `bun run dev`
Expected: Floating toolbar appears, no sidebar, content is centered

**Step 4: Commit**

```bash
git add src/theme/Layout.tsx src/theme/styles.css
git commit -m "refactor: replace sidebar with floating toolbar layout"
```

---

## Task 9: Update Theme Exports

**Files:**
- Modify: `src/theme/index.ts`

**Step 1: Update exports**

Ensure all new components are exported:

```typescript
export { Layout } from './Layout'
export { Toolbar } from './Toolbar'
export { TOCPanel } from './TOCPanel'
export { Preview } from './Preview'
// ... other exports
```

**Step 2: Commit**

```bash
git add src/theme/index.ts
git commit -m "chore: update theme exports"
```

---

## Task 10: Clean Up Old Sidebar Code

**Files:**
- Modify: `src/theme/styles.css`

**Step 1: Remove deprecated CSS**

Remove all sidebar-specific CSS that's no longer used:
- `.prev-sidebar`
- `.sidebar-*` classes
- `.prev-layout` grid styles

Keep only the floating layout and content styles.

**Step 2: Test everything still works**

Run: `bun run dev`
Expected: App works with floating toolbar, no console errors

**Step 3: Commit**

```bash
git add src/theme/styles.css
git commit -m "chore: remove deprecated sidebar styles"
```

---

## Task 11: Integration Test

**Files:**
- Create: `test/config.test.ts`

**Step 1: Write integration test**

Create `test/config.test.ts`:

```typescript
import { test, expect } from 'bun:test'
import { loadConfig, saveConfig, validateConfig } from '../src/config'
import { mkdtempSync, writeFileSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

test('loadConfig returns defaults when no file exists', () => {
  const tmpDir = mkdtempSync(join(tmpdir(), 'prev-test-'))
  const config = loadConfig(tmpDir)

  expect(config.theme).toBe('system')
  expect(config.contentWidth).toBe('constrained')
  expect(config.hidden).toEqual([])
  expect(config.order).toEqual({})

  rmSync(tmpDir, { recursive: true })
})

test('loadConfig parses .prev.yaml correctly', () => {
  const tmpDir = mkdtempSync(join(tmpdir(), 'prev-test-'))
  writeFileSync(join(tmpDir, '.prev.yaml'), `
theme: dark
contentWidth: full
hidden:
  - "drafts/**"
  - "internal/*.md"
order:
  "/":
    - intro.md
    - guides/
`)

  const config = loadConfig(tmpDir)

  expect(config.theme).toBe('dark')
  expect(config.contentWidth).toBe('full')
  expect(config.hidden).toEqual(['drafts/**', 'internal/*.md'])
  expect(config.order['/']).toEqual(['intro.md', 'guides/'])

  rmSync(tmpDir, { recursive: true })
})

test('saveConfig writes valid YAML', () => {
  const tmpDir = mkdtempSync(join(tmpdir(), 'prev-test-'))

  saveConfig(tmpDir, {
    theme: 'light',
    contentWidth: 'constrained',
    hidden: ['test.md'],
    order: { '/': ['a.md', 'b.md'] }
  })

  const reloaded = loadConfig(tmpDir)
  expect(reloaded.theme).toBe('light')
  expect(reloaded.hidden).toEqual(['test.md'])

  rmSync(tmpDir, { recursive: true })
})
```

**Step 2: Run tests**

Run: `bun test`
Expected: All tests pass

**Step 3: Commit**

```bash
git add test/config.test.ts
git commit -m "test: add config loading integration tests"
```

---

## Task 12: Documentation

**Files:**
- Modify: `README.md` or create `docs/configuration.md`

**Step 1: Document .prev.yaml usage**

Add documentation about the new config file:

```markdown
## Configuration

Create a `.prev.yaml` file in your project root:

```yaml
# Default theme: light | dark | system
theme: system

# Content width: constrained (72ch) | full
contentWidth: constrained

# Hide pages from navigation (still accessible by URL)
hidden:
  - "drafts/**"
  - "**/internal-*.md"

# Custom navigation order (auto-managed when you drag items)
order:
  "/":
    - getting-started.md
    - installation.md
    - guides/
```

You can also hide individual pages via frontmatter:

```markdown
---
title: Secret Page
hidden: true
---
```
```

**Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add configuration documentation"
```

---

## Summary

This plan implements:

1. **`.prev.yaml` config file** - Theme, content width, hidden patterns, navigation order
2. **Floating toolbar** - Draggable pill with TOC, Previews, devtools slot, theme, width toggles
3. **TOC panel** - Desktop dropdown / mobile full-screen overlay
4. **Drag-to-reorder** - Auto-saves to config immediately
5. **Hidden pages** - Via config globs or frontmatter `hidden: true`
6. **No localStorage** - Config is single source of truth

The old 260px sidebar is completely removed.
