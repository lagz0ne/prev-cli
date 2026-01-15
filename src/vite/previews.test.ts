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
