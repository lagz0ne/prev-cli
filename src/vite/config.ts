// src/vite/config.ts
import type { InlineConfig, Logger } from 'vite'
import { createLogger } from 'vite'
import react from '@vitejs/plugin-react-swc'
import mdx from '@mdx-js/rollup'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import path from 'path'
import { fileURLToPath } from 'url'
import { existsSync, readFileSync } from 'fs'
import { ensureCacheDir } from '../utils/cache'
import { pagesPlugin } from './plugins/pages-plugin'
import { entryPlugin } from './plugins/entry-plugin'
import { previewsPlugin } from './plugins/previews-plugin'
import { createConfigPlugin } from './plugins/config-plugin'
import { buildPreviewConfig } from './previews'
import { loadConfig, updateOrder } from '../config'
// fumadocsPlugin removed - using custom lightweight layout

// Create a friendly logger that filters out technical noise
function createFriendlyLogger(): Logger {
  const logger = createLogger('info', { allowClearScreen: false })

  // Messages to hide (technical details users don't need)
  const hiddenPatterns = [
    /Re-optimizing dependencies/,
    /new dependencies optimized/,
    /optimized dependencies changed/,
    /Dependencies bundled/,
    /Pre-bundling dependencies/,
    /\(client\) ✨/,
  ]

  // Messages to transform into friendlier versions
  const transformMessage = (msg: string): string | null => {
    // Hide technical messages
    for (const pattern of hiddenPatterns) {
      if (pattern.test(msg)) return null
    }

    // Transform HMR messages to be friendlier
    if (msg.includes('hmr update')) {
      const match = msg.match(/hmr update (.+)/)
      if (match) {
        return `  ↻ Updated: ${match[1]}`
      }
    }

    if (msg.includes('page reload')) {
      return '  ↻ Page reloaded'
    }

    return msg
  }

  return {
    ...logger,
    info(msg, options) {
      const transformed = transformMessage(msg)
      if (transformed) logger.info(transformed, options)
    },
    warn(msg, options) {
      // Show warnings but make them friendlier
      if (!hiddenPatterns.some(p => p.test(msg))) {
        logger.warn(msg, options)
      }
    },
    warnOnce(msg, options) {
      if (!hiddenPatterns.some(p => p.test(msg))) {
        logger.warnOnce(msg, options)
      }
    },
    error(msg, options) {
      logger.error(msg, options)
    },
    clearScreen() {
      // Don't clear screen - keep history visible
    },
    hasErrorLogged(err) {
      return logger.hasErrorLogged(err)
    },
    hasWarned: false
  }
}

// Find CLI root by locating package.json from the script location
function findCliRoot(): string {
  let dir = path.dirname(fileURLToPath(import.meta.url))

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

  return path.dirname(path.dirname(fileURLToPath(import.meta.url)))
}

// Find node_modules containing react - handles hoisted deps (bunx, npm, pnpm)
function findNodeModules(cliRoot: string): string {
  // First check if there's a local node_modules inside cliRoot
  const localNodeModules = path.join(cliRoot, 'node_modules')
  if (existsSync(path.join(localNodeModules, 'react'))) {
    return localNodeModules
  }

  // Otherwise, traverse up to find hoisted node_modules (bunx/npm case)
  let dir = cliRoot
  for (let i = 0; i < 10; i++) {
    const parent = path.dirname(dir)
    if (parent === dir) break

    // Check if parent is a node_modules folder containing react
    if (path.basename(parent) === 'node_modules' && existsSync(path.join(parent, 'react'))) {
      return parent
    }

    dir = parent
  }

  // Fallback to local node_modules
  return localNodeModules
}

const cliRoot = findCliRoot()
const cliNodeModules = findNodeModules(cliRoot)
const srcRoot = path.join(cliRoot, 'src')

export interface ConfigOptions {
  rootDir: string
  mode: 'development' | 'production'
  port?: number
  include?: string[]
}

export async function createViteConfig(options: ConfigOptions): Promise<InlineConfig> {
  const { rootDir, mode, port, include } = options
  const cacheDir = await ensureCacheDir(rootDir)
  const config = loadConfig(rootDir)

  // Note: Previews are now built separately by the previews plugin
  // using esbuild for standalone HTML output

  return {
    root: rootDir,
    mode,
    cacheDir,
    customLogger: createFriendlyLogger(),
    // Use 'silent' for production builds to hide file listing
    logLevel: mode === 'production' ? 'silent' : 'info',

    plugins: [
      mdx({
        remarkPlugins: [remarkGfm],
        rehypePlugins: [rehypeHighlight]
      }),
      react(),
      createConfigPlugin(config),
      pagesPlugin(rootDir, { include }),
      entryPlugin(rootDir),
      previewsPlugin(rootDir),
      // API endpoint for config updates (drag-and-drop reordering)
      {
        name: 'prev-config-api',
        configureServer(server) {
          server.middlewares.use('/__prev/config', async (req, res) => {
            if (req.method === 'POST') {
              let body = ''
              req.on('data', (chunk: Buffer | string) => { body += chunk })
              req.on('end', () => {
                try {
                  const { path: pathKey, order } = JSON.parse(body)
                  updateOrder(rootDir, pathKey, order)
                  res.statusCode = 200
                  res.end(JSON.stringify({ success: true }))
                } catch (e) {
                  res.statusCode = 400
                  res.end(JSON.stringify({ error: String(e) }))
                }
              })
              return
            }
            res.statusCode = 405
            res.end()
          })
        }
      },
      // Custom plugin for serving WASM-based preview routes
      {
        name: 'prev-preview-server',

        // Resolve /_preview/* imports to actual preview directory files
        resolveId(id) {
          if (id.startsWith('/_preview/')) {
            const relativePath = id.slice('/_preview/'.length)
            const previewsDir = path.join(rootDir, 'previews')
            const resolved = path.resolve(previewsDir, relativePath)

            // Security: prevent path traversal
            if (resolved.startsWith(previewsDir)) {
              return resolved
            }
          }
        },

        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            const urlPath = req.url?.split('?')[0] || ''

            // Serve WASM preview runtime template
            if (urlPath === '/_preview-runtime') {
              const templatePath = path.join(srcRoot, 'preview-runtime/template.html')
              if (existsSync(templatePath)) {
                const html = readFileSync(templatePath, 'utf-8')
                res.setHeader('Content-Type', 'text/html')
                res.end(html)
                return
              }
            }

            // Serve preview config as JSON for WASM runtime
            if (urlPath.startsWith('/_preview-config/')) {
              const previewName = decodeURIComponent(urlPath.slice('/_preview-config/'.length))
              const previewsDir = path.join(rootDir, 'previews')
              const previewDir = path.resolve(previewsDir, previewName)

              // Security: prevent path traversal
              if (!previewDir.startsWith(previewsDir)) {
                res.statusCode = 403
                res.end('Forbidden')
                return
              }

              if (existsSync(previewDir)) {
                try {
                  const config = await buildPreviewConfig(previewDir)
                  res.setHeader('Content-Type', 'application/json')
                  res.end(JSON.stringify(config))
                  return
                } catch (err) {
                  console.error('Error building preview config:', err)
                  res.statusCode = 500
                  res.end(JSON.stringify({ error: String(err) }))
                  return
                }
              }
            }

            // Legacy: Serve preview HTML files directly (fallback)
            if (urlPath.startsWith('/_preview/')) {
              const isHtmlRequest = !path.extname(urlPath) || urlPath.endsWith('/')

              if (isHtmlRequest) {
                const previewName = decodeURIComponent(urlPath.slice('/_preview/'.length).replace(/\/$/, ''))
                const previewsDir = path.join(rootDir, 'previews')
                const htmlPath = path.resolve(previewsDir, previewName, 'index.html')

                // Security: prevent path traversal
                if (!htmlPath.startsWith(previewsDir)) {
                  return next()
                }

                if (existsSync(htmlPath)) {
                  try {
                    let html = readFileSync(htmlPath, 'utf-8')
                    const previewBase = `/_preview/${previewName}/`
                    html = html.replace(
                      /(src|href)=["']\.\/([^"']+)["']/g,
                      `$1="${previewBase}$2"`
                    )
                    const transformed = await server.transformIndexHtml(req.url!, html)
                    res.setHeader('Content-Type', 'text/html')
                    res.end(transformed)
                    return
                  } catch (err) {
                    console.error('Error serving preview:', err)
                    return next()
                  }
                }
              }
            }

            next()
          })
        }
      }
    ],

    resolve: {
      alias: {
        // Project aliases
        '@prev/ui': path.join(srcRoot, 'ui'),
        '@prev/theme': path.join(srcRoot, 'theme'),
        // React aliases - ensure single instances
        'react': path.join(cliNodeModules, 'react'),
        'react-dom': path.join(cliNodeModules, 'react-dom'),
        '@tanstack/react-router': path.join(cliNodeModules, '@tanstack/react-router'),
        // Diagram libraries
        'mermaid': path.join(cliNodeModules, 'mermaid'),
        'dayjs': path.join(cliNodeModules, 'dayjs'),
        '@terrastruct/d2': path.join(cliNodeModules, '@terrastruct/d2'),
        // NOTE: Fumadocs packages handled entirely by fumadocsPlugin
      },
      // Dedupe to prevent multiple module instances (critical for React contexts)
      dedupe: [
        'react',
        'react-dom',
        '@tanstack/react-router',
      ]
    },

    optimizeDeps: {
      entries: [],  // Don't scan user's project for deps
      include: [
        'react',
        'react-dom',
        'react-dom/client',
        '@tanstack/react-router',
        'react/jsx-runtime',
        'react/jsx-dev-runtime',
        // Pre-bundle mermaid and its deps to fix ESM issues
        'mermaid',
        'dayjs',
        '@terrastruct/d2',
      ],
      exclude: [
        // Virtual modules provided by our plugins - not real packages
        'virtual:prev-config',
        'virtual:prev-previews',
        'virtual:prev-pages',
        // Theme files that import virtual modules
        '@prev/theme',
      ],
    },

    ssr: {
      noExternal: true
    },

    server: {
      port,
      strictPort: false,
      fs: {
        allow: [rootDir, cliRoot]  // Allow access to user's project and CLI source
      },
      // Warm up frequently used modules for faster initial load
      warmup: {
        clientFiles: [
          path.join(srcRoot, 'theme/entry.tsx'),
          path.join(srcRoot, 'theme/styles.css'),
        ]
      }
    },

    preview: {
      port,
      strictPort: false
    },

    build: {
      outDir: path.join(rootDir, 'dist'),
      // Suppress verbose build output for non-technical users
      reportCompressedSize: false,
      chunkSizeWarningLimit: 10000,  // 10MB - hide chunk warnings
      rollupOptions: {
        input: {
          main: path.join(srcRoot, 'theme/index.html'),
        }
      }
    }
  }
}
