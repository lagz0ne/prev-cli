// src/vite/start.ts
import { createServer, build, preview } from 'vite'
import { createViteConfig } from './config'
import { getRandomPort } from '../utils/port'

export interface DevOptions {
  port?: number
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

function printReady() {
  console.log()
  console.log('  Edit your .mdx files and see changes instantly.')
  console.log('  Press Ctrl+C to stop.')
  console.log()
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

  printWelcome('dev')
  server.printUrls()
  printReady()

  return server
}

export async function buildSite(rootDir: string) {
  console.log()
  console.log('  ✨ prev build')
  console.log()
  console.log('  Building your documentation site...')

  const config = await createViteConfig({
    rootDir,
    mode: 'production'
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
    port
  })

  const server = await preview(config)

  printWelcome('preview')
  server.printUrls()
  console.log()
  console.log('  Press Ctrl+C to stop.')
  console.log()

  return server
}
