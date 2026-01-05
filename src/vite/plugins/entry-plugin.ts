// src/vite/plugins/entry-plugin.ts
import type { Plugin } from 'vite'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const VIRTUAL_HTML_ID = 'virtual:prev-html'

export function entryPlugin(): Plugin {
  return {
    name: 'prev-entry',

    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url === '/' || !req.url?.includes('.')) {
          req.url = '/index.html'
        }
        next()
      })
    },

    resolveId(id) {
      if (id === 'index.html' || id === '/index.html') {
        return VIRTUAL_HTML_ID
      }
    },

    load(id) {
      if (id === VIRTUAL_HTML_ID) {
        const entryPath = path.join(__dirname, '../../theme/entry.tsx')

        return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Documentation</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="${entryPath}"></script>
</body>
</html>
`
      }
    }
  }
}
