// src/vite/start.ts
import { createServer, build, preview } from 'vite'
import { createViteConfig } from './config'
import { getRandomPort } from '../utils/port'
import { exec } from 'child_process'
import { existsSync, rmSync } from 'fs'
import path from 'path'

export interface DevOptions {
  port?: number
  include?: string[]
}

export interface BuildOptions {
  include?: string[]
}

function printWelcome(type: 'dev' | 'preview') {
  console.log()
  console.log('  ✨ prev')
  console.log()
  if (type === 'dev') {
    console.log('  Your docs are ready! Open in your browser:')
  } else {
    console.log('  Previewing your production build:')
  }
}

function printShortcuts() {
  console.log()
  console.log('  Shortcuts:')
  console.log('    o  →  open in browser')
  console.log('    c  →  clear cache')
  console.log('    h  →  show this help')
  console.log('    q  →  quit')
  console.log()
}

function printReady() {
  console.log()
  console.log('  Edit your .md/.mdx files and see changes instantly.')
  console.log('  Press h for shortcuts.')
  console.log()
}

function openBrowser(url: string) {
  const platform = process.platform
  const cmd = platform === 'darwin' ? 'open' :
              platform === 'win32' ? 'start' : 'xdg-open'
  exec(`${cmd} ${url}`)
  console.log(`  ↗ Opened ${url}`)
}

function clearCache(rootDir: string) {
  const viteCacheDir = path.join(rootDir, '.vite')
  const nodeModulesVite = path.join(rootDir, 'node_modules', '.vite')

  let cleared = 0

  if (existsSync(viteCacheDir)) {
    rmSync(viteCacheDir, { recursive: true })
    cleared++
  }

  if (existsSync(nodeModulesVite)) {
    rmSync(nodeModulesVite, { recursive: true })
    cleared++
  }

  if (cleared === 0) {
    console.log('  No cache to clear')
  } else {
    console.log(`  ✓ Cleared Vite cache`)
  }
}

function setupKeyboardShortcuts(rootDir: string, url: string, quit: () => void) {
  if (!process.stdin.isTTY) return

  process.stdin.setRawMode(true)
  process.stdin.resume()
  process.stdin.setEncoding('utf8')

  process.stdin.on('data', (key: string) => {
    switch (key.toLowerCase()) {
      case 'o':
        openBrowser(url)
        break
      case 'c':
        clearCache(rootDir)
        break
      case 'h':
        printShortcuts()
        break
      case 'q':
      case '\u0003': // Ctrl+C
        quit()
        break
    }
  })
}

export async function startDev(rootDir: string, options: DevOptions = {}) {
  const port = options.port ?? await getRandomPort()

  const config = await createViteConfig({
    rootDir,
    mode: 'development',
    port,
    include: options.include
  })

  const server = await createServer(config)
  await server.listen()

  const actualPort = server.config.server.port || port
  const url = `http://localhost:${actualPort}/`

  printWelcome('dev')
  server.printUrls()
  printReady()

  // Setup keyboard shortcuts
  setupKeyboardShortcuts(rootDir, url, async () => {
    console.log('\n  Shutting down...')
    await server.close()
    process.exit(0)
  })

  return server
}

export async function buildSite(rootDir: string, options: BuildOptions = {}) {
  console.log()
  console.log('  ✨ prev build')
  console.log()
  console.log('  Building your documentation site...')

  const config = await createViteConfig({
    rootDir,
    mode: 'production',
    include: options.include
  })

  await build(config)

  console.log()
  console.log('  Done! Your site is ready in ./dist')
  console.log('  You can deploy this folder anywhere.')
  console.log()
}

export async function previewSite(rootDir: string, options: DevOptions = {}) {
  const port = options.port ?? await getRandomPort()

  const config = await createViteConfig({
    rootDir,
    mode: 'production',
    port,
    include: options.include
  })

  const server = await preview(config)

  printWelcome('preview')
  server.printUrls()
  console.log()
  console.log('  Press Ctrl+C to stop.')
  console.log()

  return server
}
