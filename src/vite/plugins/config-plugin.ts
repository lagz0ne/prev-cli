import type { Plugin } from 'vite'
import type { PrevConfig } from '../../config'

const VIRTUAL_CONFIG_ID = 'virtual:prev-config'
const RESOLVED_CONFIG_ID = '\0' + VIRTUAL_CONFIG_ID

export function createConfigPlugin(config: PrevConfig): Plugin {
  return {
    name: 'prev-config',

    resolveId(id) {
      if (id === VIRTUAL_CONFIG_ID) {
        return RESOLVED_CONFIG_ID
      }
    },

    load(id) {
      if (id === RESOLVED_CONFIG_ID) {
        return `export const config = ${JSON.stringify(config)};`
      }
    }
  }
}
