// src/vite/plugins/entry-plugin.ts
import type { Plugin } from 'vite'
import path from 'path'
import { fileURLToPath } from 'url'
import { existsSync, readFileSync } from 'fs'

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

export function entryPlugin(): Plugin {
  const entryPath = path.join(srcRoot, 'theme/entry.tsx')

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Documentation</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/@fs${entryPath}"></script>
</body>
</html>`

  return {
    name: 'prev-entry',

    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url || '/'

        // Serve HTML for all non-file requests (SPA routing)
        if (url === '/' || (!url.includes('.') && !url.startsWith('/@'))) {
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
