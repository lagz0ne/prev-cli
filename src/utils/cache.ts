// src/utils/cache.ts
import { createHash } from 'crypto'
import { readdir, rm, stat, mkdir } from 'fs/promises'
import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import os from 'os'

const execAsync = promisify(exec)

const DEFAULT_CACHE_ROOT = path.join(os.homedir(), '.cache/prev')

export async function getCacheDir(rootDir: string, branch?: string): Promise<string> {
  const resolvedBranch = branch ?? await getCurrentBranch(rootDir)
  const hash = createHash('sha1')
    .update(`${rootDir}:${resolvedBranch}`)
    .digest('hex')
    .slice(0, 12)

  return path.join(DEFAULT_CACHE_ROOT, hash)
}

export async function getCurrentBranch(rootDir: string): Promise<string> {
  try {
    const { stdout } = await execAsync('git branch --show-current', { cwd: rootDir })
    return stdout.trim() || 'detached'
  } catch {
    return 'no-git'
  }
}

export async function cleanCache(options: {
  maxAgeDays: number
  cacheRoot?: string
}): Promise<number> {
  const cacheRoot = options.cacheRoot ?? DEFAULT_CACHE_ROOT
  const maxAge = options.maxAgeDays * 24 * 60 * 60 * 1000
  const now = Date.now()

  let dirs: string[]
  try {
    dirs = await readdir(cacheRoot)
  } catch {
    return 0
  }

  let removed = 0

  for (const dir of dirs) {
    const fullPath = path.join(cacheRoot, dir)
    try {
      const info = await stat(fullPath)
      if (info.isDirectory() && now - info.mtimeMs > maxAge) {
        await rm(fullPath, { recursive: true })
        removed++
      }
    } catch {
      // Skip if stat fails
    }
  }

  return removed
}

export async function ensureCacheDir(rootDir: string): Promise<string> {
  const cacheDir = await getCacheDir(rootDir)
  await mkdir(cacheDir, { recursive: true })
  return cacheDir
}
