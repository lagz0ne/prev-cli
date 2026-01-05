// src/vite/config.ts
import type { InlineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import mdx from '@mdx-js/rollup'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import rehypeMermaid from 'rehype-mermaid'
import path from 'path'
import { fileURLToPath } from 'url'
import { ensureCacheDir } from '../utils/cache'
import { pagesPlugin } from './plugins/pages-plugin'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

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
      react(),
      tailwindcss(),
      mdx({
        remarkPlugins: [remarkGfm],
        rehypePlugins: [
          rehypeHighlight,
          [rehypeMermaid, { strategy: 'img-svg' }]
        ]
      }),
      pagesPlugin(rootDir)
    ],

    resolve: {
      alias: {
        '@prev/ui': path.join(__dirname, '../ui'),
        '@prev/theme': path.join(__dirname, '../theme')
      }
    },

    server: {
      port,
      strictPort: false
    },

    build: {
      outDir: path.join(rootDir, 'dist')
    }
  }
}
