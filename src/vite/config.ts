// src/vite/config.ts
import type { InlineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'
import mdx from '@mdx-js/rollup'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import rehypeMermaid from 'rehype-mermaid'
import path from 'path'
import { fileURLToPath } from 'url'
import { ensureCacheDir } from '../utils/cache'
import { pagesPlugin } from './plugins/pages-plugin'
import { entryPlugin } from './plugins/entry-plugin'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
// In dist, __dirname is dist/vite, but we need paths relative to project root
const cliRoot = path.join(__dirname, '../..')
const cliNodeModules = path.join(cliRoot, 'node_modules')
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
        rehypePlugins: [
          rehypeHighlight,
          [rehypeMermaid, { strategy: 'img-svg' }]
        ]
      }),
      react(),
      tailwindcss(),
      pagesPlugin(rootDir),
      entryPlugin()
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

    build: {
      outDir: path.join(rootDir, 'dist')
    }
  }
}
