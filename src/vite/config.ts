// src/vite/config.ts
import type { InlineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'
import mdx from '@mdx-js/rollup'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import path from 'path'
import { fileURLToPath } from 'url'
import { existsSync, readFileSync } from 'fs'
import { ensureCacheDir } from '../utils/cache'
import { pagesPlugin } from './plugins/pages-plugin'
import { entryPlugin } from './plugins/entry-plugin'

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
}

export async function createViteConfig(options: ConfigOptions): Promise<InlineConfig> {
  const { rootDir, mode, port } = options
  const cacheDir = await ensureCacheDir(rootDir)

  return {
    root: rootDir,
    mode,
    cacheDir,

    plugins: [
      mdx({
        remarkPlugins: [remarkGfm],
        rehypePlugins: [rehypeHighlight]
      }),
      react(),
      tailwindcss(),
      pagesPlugin(rootDir),
      entryPlugin(rootDir)
    ],

    resolve: {
      alias: {
        '@prev/ui': path.join(srcRoot, 'ui'),
        '@prev/theme': path.join(srcRoot, 'theme'),
        'react': path.join(cliNodeModules, 'react'),
        'react-dom': path.join(cliNodeModules, 'react-dom'),
        'react-router-dom': path.join(cliNodeModules, 'react-router-dom')
      }
    },

    optimizeDeps: {
      entries: [],  // Don't scan user's project for deps
      include: [
        'react',
        'react-dom',
        'react-dom/client',
        'react-router-dom',
        'react/jsx-runtime',
        'react/jsx-dev-runtime'
      ],
      exclude: [
        'clsx',
        'class-variance-authority',
        'tailwind-merge'
      ]
    },

    ssr: {
      noExternal: true
    },

    server: {
      port,
      strictPort: false,
      fs: {
        allow: [rootDir, cliRoot]  // Allow access to user's project and CLI source
      }
    },

    preview: {
      port,
      strictPort: false
    },

    build: {
      outDir: path.join(rootDir, 'dist')
    }
  }
}
