// src/utils/cache.test.ts
import { test, expect, beforeEach, afterEach } from 'bun:test'
import { getCacheDir, cleanCache } from './cache'
import { mkdir, rm, utimes } from 'fs/promises'
import path from 'path'
import os from 'os'

const testCacheRoot = path.join(os.tmpdir(), 'prev-test-cache')

beforeEach(async () => {
  await mkdir(testCacheRoot, { recursive: true })
})

afterEach(async () => {
  await rm(testCacheRoot, { recursive: true, force: true })
})

test('getCacheDir returns consistent hash for same path and branch', async () => {
  const dir1 = await getCacheDir('/test/path', 'main')
  const dir2 = await getCacheDir('/test/path', 'main')
  expect(dir1).toBe(dir2)
})

test('getCacheDir returns different hash for different branches', async () => {
  const dir1 = await getCacheDir('/test/path', 'main')
  const dir2 = await getCacheDir('/test/path', 'feature')
  expect(dir1).not.toBe(dir2)
})

test('getCacheDir returns different hash for different paths', async () => {
  const dir1 = await getCacheDir('/test/path1', 'main')
  const dir2 = await getCacheDir('/test/path2', 'main')
  expect(dir1).not.toBe(dir2)
})

test('cleanCache removes directories older than maxAgeDays', async () => {
  const oldDir = path.join(testCacheRoot, 'old-cache')
  const newDir = path.join(testCacheRoot, 'new-cache')

  await mkdir(oldDir, { recursive: true })
  await mkdir(newDir, { recursive: true })

  // Set old dir mtime to 40 days ago using utimes
  const oldTime = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000)
  await utimes(oldDir, oldTime, oldTime)

  const removed = await cleanCache({ maxAgeDays: 30, cacheRoot: testCacheRoot })
  expect(removed).toBe(1)
})
