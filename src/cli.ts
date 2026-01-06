#!/usr/bin/env node
import { parseArgs } from 'util'
import { startDev, buildSite, previewSite } from './vite/start'
import { cleanCache } from './utils/cache'

const { values, positionals } = parseArgs({
  args: process.argv.slice(2),
  options: {
    port: { type: 'string', short: 'p' },
    days: { type: 'string', short: 'd' },
    help: { type: 'boolean', short: 'h' }
  },
  allowPositionals: true
})

const command = positionals[0] || 'dev'
// If second positional is provided, use it as rootDir, otherwise use cwd
const rootDir = positionals[1] || process.cwd()

function printHelp() {
  console.log(`
prev - Zero-config documentation site generator

Usage:
  prev [command] [options]

Commands:
  dev       Start development server (default)
  build     Build for production
  preview   Preview production build
  clean     Remove old cache directories

Options:
  -p, --port <port>   Specify port (dev/preview)
  -d, --days <days>   Cache age threshold for clean (default: 30)
  -h, --help          Show this help message

Examples:
  prev                Start dev server on random port
  prev dev -p 3000    Start dev server on port 3000
  prev build          Build static site to ./dist
  prev clean          Remove caches older than 30 days
  prev clean -d 7     Remove caches older than 7 days
`)
}

async function main() {
  if (values.help) {
    printHelp()
    process.exit(0)
  }

  const port = values.port ? parseInt(values.port, 10) : undefined
  const days = values.days ? parseInt(values.days, 10) : 30

  try {
    switch (command) {
      case 'dev':
        await startDev(rootDir, { port })
        break

      case 'build':
        await buildSite(rootDir)
        break

      case 'preview':
        await previewSite(rootDir, { port })
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
