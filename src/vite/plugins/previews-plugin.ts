// src/vite/plugins/previews-plugin.ts
import type { Plugin } from 'vite'
import { scanPreviews, buildPreviewConfig } from '../previews'
import { buildPreviewHtml } from '../../preview-runtime/build'
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'fs'
import path from 'path'

const VIRTUAL_MODULE_ID = 'virtual:prev-previews'
const RESOLVED_VIRTUAL_MODULE_ID = '\0' + VIRTUAL_MODULE_ID

export function previewsPlugin(rootDir: string): Plugin {
  let isBuild = false

  return {
    name: 'prev-previews',

    config(_, { command }) {
      isBuild = command === 'build'
    },

    resolveId(id) {
      if (id === VIRTUAL_MODULE_ID) {
        return RESOLVED_VIRTUAL_MODULE_ID
      }
    },

    async load(id) {
      if (id === RESOLVED_VIRTUAL_MODULE_ID) {
        const previews = await scanPreviews(rootDir)
        return `export const previews = ${JSON.stringify(previews)};`
      }
    },

    handleHotUpdate({ file, server }) {
      // Invalidate when preview files change (HTML, TSX, CSS, etc.)
      if (file.includes('/previews/') && /\.(html|tsx|ts|jsx|js|css)$/.test(file)) {
        const mod = server.moduleGraph.getModuleById(RESOLVED_VIRTUAL_MODULE_ID)
        if (mod) {
          server.moduleGraph.invalidateModule(mod)
          return [mod]
        }
      }
    },

    // Build standalone preview HTML files for production
    async closeBundle() {
      if (!isBuild) return

      const distDir = path.join(rootDir, 'dist')
      const targetDir = path.join(distDir, '_preview')
      const previewsDir = path.join(rootDir, 'previews')

      // Clean up old Vite-generated preview folder if exists
      const oldPreviewsDir = path.join(distDir, 'previews')
      if (existsSync(oldPreviewsDir)) {
        rmSync(oldPreviewsDir, { recursive: true })
      }

      // Remove old target if exists
      if (existsSync(targetDir)) {
        rmSync(targetDir, { recursive: true })
      }

      // Scan and build each preview
      const previews = await scanPreviews(rootDir)

      if (previews.length === 0) return

      console.log(`\n  Building ${previews.length} preview(s)...`)

      for (const preview of previews) {
        const previewDir = path.join(previewsDir, preview.name)

        try {
          // Build preview config from files
          const config = await buildPreviewConfig(previewDir)

          // Build standalone HTML
          const result = await buildPreviewHtml(config)

          if (result.error) {
            console.error(`    ✗ ${preview.name}: ${result.error}`)
            continue
          }

          // Write to output directory
          const outputDir = path.join(targetDir, preview.name)
          mkdirSync(outputDir, { recursive: true })
          writeFileSync(path.join(outputDir, 'index.html'), result.html)

          console.log(`    ✓ ${preview.name}`)
        } catch (err) {
          console.error(`    ✗ ${preview.name}: ${err}`)
        }
      }
    }
  }
}
