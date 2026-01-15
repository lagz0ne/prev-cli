import { test, expect, beforeAll, afterAll, describe } from 'bun:test'
import { spawn } from 'bun'
import { mkdtemp, rm, writeFile, mkdir } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'

const CLI_PATH = join(import.meta.dir, '../dist/cli.js')
let testDir: string

beforeAll(async () => {
  // Create temp directory with sample MDX content and a preview
  testDir = await mkdtemp(join(tmpdir(), 'prev-cli-preview-test-'))

  // Create index.mdx with Preview component usage
  await writeFile(join(testDir, 'index.mdx'), `---
title: Home
---

# Welcome

Check out the preview:

<Preview src="demo" />
`)

  // Create preview directory structure
  await mkdir(join(testDir, 'previews/demo'), { recursive: true })
  await writeFile(join(testDir, 'previews/demo/index.html'), `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Demo Preview</title>
  <style>
    body { font-family: system-ui; padding: 2rem; }
    h1 { color: #3b82f6; }
  </style>
</head>
<body>
  <h1>Demo Component</h1>
  <p>This is a preview component.</p>
</body>
</html>
`)
})

afterAll(async () => {
  if (testDir) {
    await rm(testDir, { recursive: true, force: true })
  }
})

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

describe('preview feature integration', () => {
  test('build completes successfully with previews directory', async () => {
    const { stdout, stderr, exitCode } = await runCli(['build'])

    expect(exitCode).toBe(0)
    expect(stdout).toContain('Done! Your site is ready')

    // Check no critical errors
    expect(stderr).not.toContain('Error:')
    expect(stderr).not.toMatch(/error:/i)

    // Verify main dist folder exists
    const distIndexExists = await Bun.file(join(testDir, 'dist', 'index.html')).exists()
    expect(distIndexExists).toBe(true)

    // Verify assets are generated
    const assetsDir = join(testDir, 'dist', 'assets')
    const assets = await Array.fromAsync(new Bun.Glob('*').scan(assetsDir))
    expect(assets.some(f => f.endsWith('.js'))).toBe(true)
    expect(assets.some(f => f.endsWith('.css'))).toBe(true)
  }, 120000)

  test('scanPreviews finds preview directories', async () => {
    // Import and test the scanning functionality directly
    const { scanPreviews } = await import('../src/vite/previews')

    const previews = await scanPreviews(testDir)
    expect(previews).toHaveLength(1)
    expect(previews[0].name).toBe('demo')
    expect(previews[0].route).toBe('/_preview/demo')
    expect(previews[0].htmlPath).toContain('previews/demo/index.html')
  })

  test('dev server starts and serves main page', async () => {
    const port = 4770 + Math.floor(Math.random() * 100)
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

      // Fetch the main page
      const mainRes = await fetch(`http://localhost:${port}/`)
      expect(mainRes.status).toBe(200)

      const mainHtml = await mainRes.text()
      expect(mainHtml).toContain('<!DOCTYPE html>')
      expect(mainHtml).toContain('<div id="root">')
    } finally {
      proc.kill()
      await Bun.sleep(100)
    }
  }, 60000)

  test('preview command serves built files', async () => {
    // Ensure build exists from previous test
    const distExists = await Bun.file(join(testDir, 'dist', 'index.html')).exists()
    if (!distExists) {
      await runCli(['build'])
    }

    const port = 4870 + Math.floor(Math.random() * 100)
    const proc = spawn({
      cmd: ['bun', CLI_PATH, 'preview', '--port', String(port)],
      cwd: testDir,
      stdout: 'inherit',
      stderr: 'inherit',
    })

    try {
      const ready = await waitForServer(`http://localhost:${port}`)
      expect(ready).toBe(true)

      // Fetch the main page from production build
      const mainRes = await fetch(`http://localhost:${port}/`)
      expect(mainRes.status).toBe(200)

      const mainHtml = await mainRes.text()
      expect(mainHtml).toContain('<!DOCTYPE html>')
    } finally {
      proc.kill()
      await Bun.sleep(100)
    }
  }, 60000)
})
