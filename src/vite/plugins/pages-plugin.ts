// src/vite/plugins/pages-plugin.ts
import type { Plugin } from 'vite'
import { scanPages, buildSidebarTree } from '../pages'

const VIRTUAL_MODULE_ID = 'virtual:prev-pages'
const RESOLVED_VIRTUAL_MODULE_ID = '\0' + VIRTUAL_MODULE_ID

export function pagesPlugin(rootDir: string): Plugin {
  return {
    name: 'prev-pages',

    resolveId(id) {
      if (id === VIRTUAL_MODULE_ID) {
        return RESOLVED_VIRTUAL_MODULE_ID
      }
    },

    async load(id) {
      if (id === RESOLVED_VIRTUAL_MODULE_ID) {
        const pages = await scanPages(rootDir)
        const sidebar = buildSidebarTree(pages)

        return `
          export const pages = ${JSON.stringify(pages)};
          export const sidebar = ${JSON.stringify(sidebar)};
        `
      }
    },

    handleHotUpdate({ file, server }) {
      if (file.endsWith('.mdx')) {
        const mod = server.moduleGraph.getModuleById(RESOLVED_VIRTUAL_MODULE_ID)
        if (mod) {
          server.moduleGraph.invalidateModule(mod)
          return [mod]
        }
      }
    }
  }
}
