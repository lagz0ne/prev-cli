// src/vite/plugins/previews-plugin.ts
import type { Plugin } from 'vite'
import { scanPreviews } from '../previews'

const VIRTUAL_MODULE_ID = 'virtual:prev-previews'
const RESOLVED_VIRTUAL_MODULE_ID = '\0' + VIRTUAL_MODULE_ID

export function previewsPlugin(rootDir: string): Plugin {
  return {
    name: 'prev-previews',

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
      // Invalidate when preview HTML files change
      if (file.includes('/previews/') && file.endsWith('.html')) {
        const mod = server.moduleGraph.getModuleById(RESOLVED_VIRTUAL_MODULE_ID)
        if (mod) {
          server.moduleGraph.invalidateModule(mod)
          return [mod]
        }
      }
    }
  }
}
