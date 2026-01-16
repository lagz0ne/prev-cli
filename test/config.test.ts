import { test, expect } from 'bun:test'
import { loadConfig, saveConfig } from '../src/config'
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
