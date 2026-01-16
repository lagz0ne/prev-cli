#!/usr/bin/env node
import { parseArgs } from 'util'
import path from 'path'
import { existsSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { startDev, buildSite, previewSite } from './vite/start'
import { cleanCache, getCacheDir } from './utils/cache'

// Get version from package.json
function getVersion(): string {
  try {
    let dir = path.dirname(fileURLToPath(import.meta.url))
    for (let i = 0; i < 5; i++) {
      const pkgPath = path.join(dir, 'package.json')
      if (existsSync(pkgPath)) {
        const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'))
        if (pkg.name === 'prev-cli') return pkg.version
      }
      dir = path.dirname(dir)
    }
  } catch {}
  return 'unknown'
}

const { values, positionals } = parseArgs({
  args: process.argv.slice(2),
  options: {
    port: { type: 'string', short: 'p' },
    days: { type: 'string', short: 'd' },
    cwd: { type: 'string', short: 'c' },
    include: { type: 'string', short: 'i', multiple: true },
    help: { type: 'boolean', short: 'h' },
    version: { type: 'boolean', short: 'v' }
  },
  allowPositionals: true
})

const command = positionals[0] || 'dev'
// Priority: --cwd option > positional argument > process.cwd()
// Always resolve to absolute path to ensure proper cache isolation
const rootDir = path.resolve(values.cwd || positionals[1] || '.')

function printHelp() {
  console.log(`
prev - Zero-config documentation site generator

Usage:
  prev [options]              Start development server
  prev build [options]        Build for production
  prev preview [options]      Preview production build
  prev create [name]          Create preview in previews/<name>/ (default: "example")
  prev clearcache             Clear Vite cache (.vite directory)
  prev clean [options]        Remove old prev-cli caches

Options:
  -c, --cwd <path>       Set working directory
  -p, --port <port>      Specify port (dev/preview)
  -i, --include <dir>    Include dot-prefixed directory (can use multiple times)
  -d, --days <days>      Cache age threshold for clean (default: 30)
  -h, --help             Show this help message
  -v, --version          Show version number

Floating Toolbar:
  A draggable pill at the bottom of the screen with:
    - TOC button: Opens navigation panel (dropdown on desktop, overlay on mobile)
    - Previews button: Links to /previews catalog (if previews exist)
    - Width toggle: Switch between constrained and full-width content
    - Theme toggle: Switch between light and dark mode

Configuration (.prev.yaml):
  Create a .prev.yaml file in your docs root to customize behavior:

    theme: system          # light | dark | system (default: system)
    contentWidth: constrained  # constrained | full (default: constrained)
    hidden:                # Glob patterns for pages to hide
      - "internal/**"
      - "wip-*.md"
    order:                 # Custom page ordering
      "/":
        - "getting-started.md"
        - "guides/"

  Pages can also be hidden via frontmatter:
    ---
    hidden: true
    ---

  Drag pages in the TOC panel to reorder - changes auto-save to config.

Previews:
  Previews must be in the previews/ directory at your project root.
  Each preview is a subfolder with React components:

    previews/                # Required location
      my-demo/               # Preview name (used in <Preview src="...">)
        App.tsx              # React component (entry point)
        styles.css           # Optional CSS

  Then embed in MDX:
    import { Preview } from '@prev/theme'

    <Preview src="my-demo" />
    <Preview src="my-demo" height={600} />
    <Preview src="my-demo" title="Counter Demo" />

  Preview props:
    src      Required. Name of the preview folder
    height   Iframe height in pixels (default: 400)
    title    Display title (default: folder name)

  DevTools (floating pill in preview):
    - Device modes: mobile (375px), tablet (768px), desktop
    - Custom width slider (320-1920px)
    - Dark mode toggle
    - Fullscreen mode

  Previews are bundled via esbuild-wasm in dev, and pre-compiled
  to standalone HTML files in production builds.

  Browse all previews at /previews (Storybook-like catalog).

Examples:
  prev                       Start dev server on random port
  prev -p 3000               Start dev server on port 3000
  prev build                 Build static site to ./dist
  prev create                Create example preview in previews/example/
  prev create my-demo        Create preview in previews/my-demo/
  prev -i .c3                Include .c3 directory in docs
  prev clean -d 7            Remove caches older than 7 days
`)
}

async function clearViteCache(rootDir: string) {
  let cleared = 0

  // Clear the prev-cli cache in ~/.cache/prev/<hash>/
  try {
    const prevCacheDir = await getCacheDir(rootDir)
    if (existsSync(prevCacheDir)) {
      rmSync(prevCacheDir, { recursive: true })
      cleared++
      console.log(`  ✓ Removed ${prevCacheDir}`)
    }
  } catch {
    // Ignore errors getting cache dir
  }

  // Also check legacy locations
  const viteCacheDir = path.join(rootDir, '.vite')
  const nodeModulesVite = path.join(rootDir, 'node_modules', '.vite')

  if (existsSync(viteCacheDir)) {
    rmSync(viteCacheDir, { recursive: true })
    cleared++
    console.log(`  ✓ Removed .vite/`)
  }

  if (existsSync(nodeModulesVite)) {
    rmSync(nodeModulesVite, { recursive: true })
    cleared++
    console.log(`  ✓ Removed node_modules/.vite/`)
  }

  if (cleared === 0) {
    console.log('  No Vite cache found')
  } else {
    console.log(`\n  Cleared ${cleared} cache director${cleared === 1 ? 'y' : 'ies'}`)
  }
}

function createPreview(rootDir: string, name: string) {
  const previewDir = path.join(rootDir, 'previews', name)

  if (existsSync(previewDir)) {
    console.error(`Preview "${name}" already exists at: ${previewDir}`)
    process.exit(1)
  }

  mkdirSync(previewDir, { recursive: true })

  // App.tsx - Main component demonstrating React + TypeScript + Tailwind
  const appTsx = `import { useState } from 'react'
import './styles.css'

export default function App() {
  const [count, setCount] = useState(0)
  const [items, setItems] = useState<string[]>([])

  const addItem = () => {
    setItems([...items, \`Item \${items.length + 1}\`])
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-100 p-8">
      <div className="max-w-md mx-auto space-y-6">
        {/* Header */}
        <div className="text-center animate-fade-in">
          <h1 className="text-3xl font-bold text-gray-800">
            Preview Demo
          </h1>
          <p className="text-gray-600 mt-2">
            React + TypeScript + Tailwind
          </p>
        </div>

        {/* Counter Card */}
        <div className="bg-white rounded-xl shadow-lg p-6 animate-fade-in">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">Counter</h2>
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => setCount(c => c - 1)}
              className="w-12 h-12 rounded-full bg-red-500 hover:bg-red-600 text-white text-xl font-bold transition-colors"
            >
              -
            </button>
            <span className="text-4xl font-mono font-bold text-gray-800 w-16 text-center">
              {count}
            </span>
            <button
              onClick={() => setCount(c => c + 1)}
              className="w-12 h-12 rounded-full bg-green-500 hover:bg-green-600 text-white text-xl font-bold transition-colors"
            >
              +
            </button>
          </div>
        </div>

        {/* Dynamic List Card */}
        <div className="bg-white rounded-xl shadow-lg p-6 animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-700">Dynamic List</h2>
            <button
              onClick={addItem}
              className="px-3 py-1 bg-indigo-500 hover:bg-indigo-600 text-white text-sm rounded-lg transition-colors"
            >
              Add Item
            </button>
          </div>
          {items.length === 0 ? (
            <p className="text-gray-400 text-center py-4">No items yet</p>
          ) : (
            <ul className="space-y-2">
              {items.map((item, i) => (
                <li
                  key={i}
                  className="px-3 py-2 bg-gray-50 rounded-lg text-gray-700 animate-slide-in"
                >
                  {item}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Info Box */}
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 text-sm text-indigo-700">
          <strong>Tip:</strong> Use the DevTools pill (bottom-right) to test
          responsive layouts and dark mode.
        </div>
      </div>
    </div>
  )
}
`

  // styles.css - Custom animations
  const stylesCss = `/* Custom animations for the preview */
@keyframes fade-in {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes slide-in {
  from {
    opacity: 0;
    transform: translateX(-10px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.animate-fade-in {
  animation: fade-in 0.3s ease-out;
}

.animate-slide-in {
  animation: slide-in 0.2s ease-out;
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .dark\\:bg-gray-900 { background-color: #111827; }
  .dark\\:text-white { color: #fff; }
}
`

  writeFileSync(path.join(previewDir, 'App.tsx'), appTsx)
  writeFileSync(path.join(previewDir, 'styles.css'), stylesCss)

  console.log(`
  ✨ Created preview: previews/${name}/

  Files:
    previews/${name}/App.tsx      React component (entry point)
    previews/${name}/styles.css   Custom animations

  Embed in your MDX:
    import { Preview } from '@prev/theme'
    <Preview src="${name}" />

  Start dev server:
    prev
`)
}

async function main() {
  if (values.version) {
    console.log(`prev-cli v${getVersion()}`)
    process.exit(0)
  }

  if (values.help) {
    printHelp()
    process.exit(0)
  }

  const port = values.port ? parseInt(values.port, 10) : undefined
  const days = values.days ? parseInt(values.days, 10) : 30
  const include = values.include || []

  try {
    switch (command) {
      case 'dev':
        await startDev(rootDir, { port, include })
        break

      case 'build':
        await buildSite(rootDir, { include })
        break

      case 'preview':
        await previewSite(rootDir, { port, include })
        break

      case 'clean':
        const removed = await cleanCache({ maxAgeDays: days })
        console.log(`Removed ${removed} cache(s) older than ${days} days`)
        break

      case 'create':
        const previewName = positionals[1] || 'example'
        createPreview(rootDir, previewName)
        break

      case 'clearcache':
        await clearViteCache(rootDir)
        break

      default:
        console.error(`Unknown command: ${command}`)
        printHelp()
        process.exit(1)
    }
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error)
    process.exit(1)
  }
}

main()
