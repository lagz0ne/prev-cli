#!/usr/bin/env node
import { parseArgs } from 'util'
import path from 'path'
import { startDev, buildSite, previewSite } from './vite/start'
import { cleanCache } from './utils/cache'

const { values, positionals } = parseArgs({
  args: process.argv.slice(2),
  options: {
    port: { type: 'string', short: 'p' },
    days: { type: 'string', short: 'd' },
    cwd: { type: 'string', short: 'c' },
    include: { type: 'string', short: 'i', multiple: true },
    help: { type: 'boolean', short: 'h' }
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
  prev clean [options]        Remove old cache directories

Options:
  -c, --cwd <path>       Set working directory
  -p, --port <port>      Specify port (dev/preview)
  -i, --include <dir>    Include dot-prefixed directory (can use multiple times)
  -d, --days <days>      Cache age threshold for clean (default: 30)
  -h, --help             Show this help message

Previews:
  Create interactive previews in your docs by adding React components
  to the previews/ directory:

    previews/
      my-demo/
        App.tsx          # React component (entry)
        styles.css       # Optional CSS

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

Examples:
  prev                       Start dev server on random port
  prev -p 3000               Start dev server on port 3000
  prev build                 Build static site to ./dist
  prev -i .c3                Include .c3 directory in docs
  prev clean -d 7            Remove caches older than 7 days
`)
}

async function main() {
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
