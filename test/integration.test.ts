import { test, expect, beforeAll, afterAll, describe } from 'bun:test'
import { spawn, type Subprocess } from 'bun'
import { mkdtemp, rm, writeFile, mkdir } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'

const CLI_PATH = join(import.meta.dir, '../dist/cli.js')
let testDir: string

beforeAll(async () => {
  // Create temp directory with sample MDX content
  testDir = await mkdtemp(join(tmpdir(), 'prev-cli-test-'))

  await mkdir(join(testDir, 'guide'))

  await writeFile(join(testDir, 'index.mdx'), `---
title: Home
---

# Welcome

This is the **home page** with some content.

\`\`\`js
console.log('Hello, world!')
\`\`\`
`)

  await writeFile(join(testDir, 'guide', 'getting-started.mdx'), `---
title: Getting Started
---

# Getting Started

Follow these steps to get started.

1. Install the package
2. Run the dev server
3. Build for production
`)
})

afterAll(async () => {
  if (testDir) {
    await rm(testDir, { recursive: true, force: true })
  }
})

async function waitForServer(url: string, timeout = 30000): Promise<boolean> {
  const start = Date.now()
  while (Date.now() - start < timeout) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(1000) })
      if (res.ok) return true
    } catch {
      await Bun.sleep(500)
    }
  }
  return false
}

async function runCli(args: string[]): Promise<{
  stdout: string
  stderr: string
  exitCode: number
}> {
  const proc = spawn({
    cmd: ['bun', CLI_PATH, ...args],
    cwd: testDir,
    stdout: 'pipe',
    stderr: 'pipe',
  })

  const stdout = await new Response(proc.stdout).text()
  const stderr = await new Response(proc.stderr).text()
  const exitCode = await proc.exited

  return { stdout, stderr, exitCode }
}

describe('prev-cli integration', () => {
  test('build command creates dist folder without errors', async () => {
    const { stdout, stderr, exitCode } = await runCli(['build'])

    expect(exitCode).toBe(0)
    expect(stdout).toContain('Build complete')

    // Check no critical errors (warnings are ok)
    expect(stderr).not.toContain('Error:')
    expect(stderr).not.toMatch(/error:/i)

    // Verify dist folder exists with expected files
    const distExists = await Bun.file(join(testDir, 'dist', 'index.html')).exists()
    expect(distExists).toBe(true)

    const assetsDir = join(testDir, 'dist', 'assets')
    const assets = await Array.fromAsync(new Bun.Glob('*').scan(assetsDir))

    // Should have JS and CSS files
    expect(assets.some(f => f.endsWith('.js'))).toBe(true)
    expect(assets.some(f => f.endsWith('.css'))).toBe(true)
  }, 120000)

  test('dev server starts and serves pages', async () => {
    const port = 4570 + Math.floor(Math.random() * 100)
    const proc = spawn({
      cmd: ['bun', CLI_PATH, 'dev', '--port', String(port)],
      cwd: testDir,
      stdout: 'inherit',
      stderr: 'inherit',
    })

    try {
      // Wait for server to be ready
      const ready = await waitForServer(`http://localhost:${port}`)
      expect(ready).toBe(true)

      // Fetch home page
      const homeRes = await fetch(`http://localhost:${port}/`)
      expect(homeRes.status).toBe(200)

      const homeHtml = await homeRes.text()
      expect(homeHtml).toContain('<!DOCTYPE html>')
      expect(homeHtml).toContain('<div id="root">')
      expect(homeHtml).toContain('type="module"')

      // Fetch a nested route
      const guideRes = await fetch(`http://localhost:${port}/guide/getting-started`)
      expect(guideRes.status).toBe(200)
    } finally {
      proc.kill()
      await Bun.sleep(100)
    }
  }, 60000)

  test('preview server serves built files', async () => {
    // Build first (should already be built from previous test, but ensure)
    const distExists = await Bun.file(join(testDir, 'dist', 'index.html')).exists()
    if (!distExists) {
      await runCli(['build'])
    }

    const port = 4670 + Math.floor(Math.random() * 100)
    const proc = spawn({
      cmd: ['bun', CLI_PATH, 'preview', '--port', String(port)],
      cwd: testDir,
      stdout: 'inherit',
      stderr: 'inherit',
    })

    try {
      const ready = await waitForServer(`http://localhost:${port}`)
      expect(ready).toBe(true)

      // Fetch home page
      const homeRes = await fetch(`http://localhost:${port}/`)
      expect(homeRes.status).toBe(200)

      const homeHtml = await homeRes.text()
      expect(homeHtml).toContain('<!DOCTYPE html>')

      // Verify assets are loadable
      const jsMatch = homeHtml.match(/src="([^"]+\.js)"/)
      if (jsMatch) {
        const jsUrl = jsMatch[1].startsWith('/')
          ? `http://localhost:${port}${jsMatch[1]}`
          : `http://localhost:${port}/${jsMatch[1]}`
        const jsRes = await fetch(jsUrl)
        expect(jsRes.status).toBe(200)
        expect(jsRes.headers.get('content-type')).toContain('javascript')
      }

      const cssMatch = homeHtml.match(/href="([^"]+\.css)"/)
      if (cssMatch) {
        const cssUrl = cssMatch[1].startsWith('/')
          ? `http://localhost:${port}${cssMatch[1]}`
          : `http://localhost:${port}/${cssMatch[1]}`
        const cssRes = await fetch(cssUrl)
        expect(cssRes.status).toBe(200)
        expect(cssRes.headers.get('content-type')).toContain('css')
      }
    } finally {
      proc.kill()
      await Bun.sleep(100)
    }
  }, 60000)
})
