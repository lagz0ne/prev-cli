// src/vite/plugins/entry-plugin.ts
import type { Plugin } from 'vite'
import path from 'path'
import { fileURLToPath } from 'url'
import { existsSync, readFileSync, writeFileSync, unlinkSync } from 'fs'

// Find CLI root by locating package.json from the script location
function findCliRoot(): string {
  // Start from the directory of this script (works for both bundled and unbundled)
  let dir = path.dirname(fileURLToPath(import.meta.url))

  // Walk up until we find package.json with name "prev-cli"
  for (let i = 0; i < 10; i++) {
    const pkgPath = path.join(dir, 'package.json')
    if (existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'))
        if (pkg.name === 'prev-cli') {
          return dir
        }
      } catch {}
    }
    const parent = path.dirname(dir)
    if (parent === dir) break
    dir = parent
  }

  // Fallback: assume we're in dist/ and go up one level
  return path.dirname(path.dirname(fileURLToPath(import.meta.url)))
}

const cliRoot = findCliRoot()
const srcRoot = path.join(cliRoot, 'src')

function getHtml(entryPath: string, forBuild = false): string {
  // For build, use relative path; for dev, use /@fs/ path
  const scriptSrc = forBuild ? entryPath : `/@fs${entryPath}`

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Documentation</title>
  <!-- Preconnect to Google Fonts for faster loading -->
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <!-- Preload critical fonts -->
  <link rel="preload" href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&family=IBM+Plex+Mono:wght@400;500&display=swap" as="style" />
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&family=IBM+Plex+Mono:wght@400;500&display=swap" />
</head>
<body>
  <div id="root"></div>
  <script type="module" src="${scriptSrc}"></script>
</body>
</html>`
}

export function entryPlugin(rootDir?: string): Plugin {
  const entryPath = path.join(srcRoot, 'theme/entry.tsx')
  let tempHtmlPath: string | null = null

  return {
    name: 'prev-entry',

    config(config, { command }) {
      if (command === 'build' && rootDir) {
        // For build, write a temp HTML file with the entry
        tempHtmlPath = path.join(rootDir, 'index.html')
        writeFileSync(tempHtmlPath, getHtml(entryPath, true))

        // Preserve existing inputs (e.g., preview entries from config.ts) and add our main entry
        const existingInput = config.build?.rollupOptions?.input || {}
        const inputObj = typeof existingInput === 'string'
          ? { _original: existingInput }
          : Array.isArray(existingInput)
          ? Object.fromEntries(existingInput.map((f, i) => [`entry${i}`, f]))
          : existingInput

        return {
          build: {
            rollupOptions: {
              input: {
                ...inputObj,
                main: tempHtmlPath  // Our main entry
              }
            }
          }
        }
      }
    },

    buildEnd() {
      // Clean up temp HTML after build
      if (tempHtmlPath && existsSync(tempHtmlPath)) {
        unlinkSync(tempHtmlPath)
        tempHtmlPath = null
      }
    },

    configureServer(server) {
      const html = getHtml(entryPath, false)

      server.middlewares.use(async (req, res, next) => {
        const url = req.url || '/'

        // Serve HTML for all non-file requests (SPA routing)
        // Exclude /_preview* routes - handled by preview-server plugin
        if (url === '/' || (!url.includes('.') && !url.startsWith('/@') && !url.startsWith('/_preview'))) {
          try {
            const transformed = await server.transformIndexHtml(url, html)
            res.setHeader('Content-Type', 'text/html')
            res.statusCode = 200
            res.end(transformed)
            return
          } catch (e) {
            console.error('Entry plugin error:', e)
            next()
            return
          }
        }

        next()
      })
    }
  }
}
