// src/vite/start.ts
import { createServer, build, preview } from 'vite'
import { createViteConfig } from './config'
import { getRandomPort } from '../utils/port'

export interface DevOptions {
  port?: number
}

export async function startDev(rootDir: string, options: DevOptions = {}) {
  const port = options.port ?? await getRandomPort()

  const config = await createViteConfig({
    rootDir,
    mode: 'development',
    port
  })

  const server = await createServer(config)
  await server.listen()

  console.log()
  console.log(`  prev dev server running at:`)
  server.printUrls()
  console.log()

  return server
}

export async function buildSite(rootDir: string) {
  const config = await createViteConfig({
    rootDir,
    mode: 'production'
  })

  await build(config)

  console.log()
  console.log(`  Build complete. Output in ./dist`)
  console.log()
}

export async function previewSite(rootDir: string, options: DevOptions = {}) {
  const port = options.port ?? await getRandomPort()

  const config = await createViteConfig({
    rootDir,
    mode: 'production',
    port
  })

  const server = await preview(config)

  console.log()
  console.log(`  Preview server running at:`)
  server.printUrls()
  console.log()

  return server
}
