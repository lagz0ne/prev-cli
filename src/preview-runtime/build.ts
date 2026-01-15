// src/preview-runtime/build.ts
// Production build for previews - pre-bundles React/TSX at build time

import { build } from 'esbuild'
import type { PreviewConfig } from './types'

export interface PreviewBuildResult {
  html: string
  error?: string
}

/**
 * Build a preview into a standalone HTML file for production
 * Uses esbuild (native) to bundle at build time
 */
export async function buildPreviewHtml(config: PreviewConfig): Promise<PreviewBuildResult> {
  try {
    // Build virtual filesystem
    const virtualFs: Record<string, { contents: string; loader: string }> = {}
    for (const file of config.files) {
      const ext = file.path.split('.').pop()?.toLowerCase()
      const loader = ext === 'css' ? 'css' : ext === 'json' ? 'json' : ext || 'tsx'
      virtualFs[file.path] = { contents: file.content, loader }
    }

    // Find entry and check if it exports default
    const entryFile = config.files.find(f => f.path === config.entry)
    if (!entryFile) {
      return { html: '', error: `Entry file not found: ${config.entry}` }
    }

    const hasDefaultExport = /export\s+default/.test(entryFile.content)

    // Create entry wrapper
    const entryCode = hasDefaultExport ? `
      import React from 'react'
      import { createRoot } from 'react-dom/client'
      import App from './${config.entry}'

      const root = createRoot(document.getElementById('root'))
      root.render(React.createElement(App))
    ` : `
      import './${config.entry}'
    `

    // Bundle with esbuild
    const result = await build({
      stdin: {
        contents: entryCode,
        loader: 'tsx',
        resolveDir: '/',
      },
      bundle: true,
      write: false,
      format: 'esm',
      jsx: 'automatic',
      jsxImportSource: 'react',
      target: 'es2020',
      minify: true,
      plugins: [{
        name: 'virtual-fs',
        setup(build) {
          // External: React from CDN
          build.onResolve({ filter: /^react(-dom)?(\/.*)?$/ }, args => {
            const parts = args.path.split('/')
            const pkg = parts[0]
            const subpath = parts.slice(1).join('/')
            const url = subpath
              ? `https://esm.sh/${pkg}@18/${subpath}`
              : `https://esm.sh/${pkg}@18`
            return { path: url, external: true }
          })

          // Auto-resolve npm packages via esm.sh
          build.onResolve({ filter: /^[^./]/ }, args => {
            if (args.path.startsWith('https://')) return
            return { path: `https://esm.sh/${args.path}`, external: true }
          })

          // Resolve relative imports
          build.onResolve({ filter: /^\./ }, args => {
            let resolved = args.path.replace(/^\.\//, '')
            if (!resolved.includes('.')) {
              for (const ext of ['.tsx', '.ts', '.jsx', '.js', '.css']) {
                if (virtualFs[resolved + ext]) {
                  resolved = resolved + ext
                  break
                }
              }
            }
            return { path: resolved, namespace: 'virtual' }
          })

          // Load from virtual filesystem
          build.onLoad({ filter: /.*/, namespace: 'virtual' }, args => {
            const file = virtualFs[args.path]
            if (file) {
              // CSS: convert to JS that injects styles
              if (file.loader === 'css') {
                const css = file.contents.replace(/`/g, '\\`').replace(/\$/g, '\\$')
                return {
                  contents: `
                    const style = document.createElement('style');
                    style.textContent = \`${css}\`;
                    document.head.appendChild(style);
                  `,
                  loader: 'js',
                }
              }
              return { contents: file.contents, loader: file.loader as any }
            }
            return { contents: '', loader: 'empty' }
          })
        },
      }],
    })

    const jsFile = result.outputFiles.find(f => f.path.endsWith('.js')) || result.outputFiles[0]
    const jsCode = jsFile?.text || ''

    // Generate standalone HTML
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Preview</title>
  <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
  <style>
    body { margin: 0; }
    #root { min-height: 100vh; }
  </style>
</head>
<body>
  <div id="root"></div>
  <script type="module">${jsCode}</script>
</body>
</html>`

    return { html }
  } catch (err) {
    return {
      html: '',
      error: err instanceof Error ? err.message : String(err),
    }
  }
}
