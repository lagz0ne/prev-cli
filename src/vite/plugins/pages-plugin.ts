// src/vite/plugins/pages-plugin.ts
import type { Plugin } from 'vite'
import path from 'path'
import { scanPages, buildSidebarTree } from '../pages'

const VIRTUAL_MODULE_ID = 'virtual:prev-pages'
const RESOLVED_VIRTUAL_MODULE_ID = '\0' + VIRTUAL_MODULE_ID

const VIRTUAL_MODULES_ID = 'virtual:prev-page-modules'
const RESOLVED_VIRTUAL_MODULES_ID = '\0' + VIRTUAL_MODULES_ID

export interface PagesPluginOptions {
  include?: string[]
}

export function pagesPlugin(rootDir: string, options: PagesPluginOptions = {}): Plugin {
  const { include } = options
  let cachedPages: Awaited<ReturnType<typeof scanPages>> | null = null

  async function getPages() {
    if (!cachedPages) {
      cachedPages = await scanPages(rootDir, { include })
    }
    return cachedPages
  }

  return {
    name: 'prev-pages',

    resolveId(id) {
      if (id === VIRTUAL_MODULE_ID) {
        return RESOLVED_VIRTUAL_MODULE_ID
      }
      if (id === VIRTUAL_MODULES_ID) {
        return RESOLVED_VIRTUAL_MODULES_ID
      }
    },

    async load(id) {
      if (id === RESOLVED_VIRTUAL_MODULE_ID) {
        const pages = await getPages()
        const sidebar = buildSidebarTree(pages)

        return `
          export const pages = ${JSON.stringify(pages)};
          export const sidebar = ${JSON.stringify(sidebar)};
        `
      }

      // Generate dynamic imports for all page modules
      // This resolves paths from the project root, not the entry file location
      if (id === RESOLVED_VIRTUAL_MODULES_ID) {
        const pages = await getPages()

        // Generate import statements for each page file
        const imports = pages.map((page, i) => {
          const absolutePath = path.join(rootDir, page.file)
          return `import * as _page${i} from ${JSON.stringify(absolutePath)};`
        }).join('\n')

        // Generate the pageModules map
        const entries = pages.map((page, i) => {
          return `  ${JSON.stringify('/' + page.file)}: _page${i}`
        }).join(',\n')

        return `${imports}

export const pageModules = {
${entries}
};`
      }
    },

    handleHotUpdate({ file, server }) {
      if (file.endsWith('.mdx') || file.endsWith('.md')) {
        // Clear cache on file change
        cachedPages = null

        const mod = server.moduleGraph.getModuleById(RESOLVED_VIRTUAL_MODULE_ID)
        const modulesMod = server.moduleGraph.getModuleById(RESOLVED_VIRTUAL_MODULES_ID)
        const mods = []
        if (mod) {
          server.moduleGraph.invalidateModule(mod)
          mods.push(mod)
        }
        if (modulesMod) {
          server.moduleGraph.invalidateModule(modulesMod)
          mods.push(modulesMod)
        }
        return mods.length > 0 ? mods : undefined
      }
    }
  }
}
