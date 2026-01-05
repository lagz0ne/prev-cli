// src/vite/plugins/entry-plugin.ts
import type { Plugin } from 'vite'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
// In dist, __dirname is dist/vite/plugins, but we need src/theme
const srcRoot = path.join(__dirname, '../../../src')

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
