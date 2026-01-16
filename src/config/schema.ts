export interface PrevConfig {
  theme: 'light' | 'dark' | 'system'
  contentWidth: 'constrained' | 'full'
  hidden: string[]
  order: Record<string, string[]>
  port?: number
}

export const defaultConfig: PrevConfig = {
  theme: 'system',
  contentWidth: 'constrained',
  hidden: [],
  order: {},
  port: undefined
}

export function validateConfig(raw: unknown): PrevConfig {
  const config = { ...defaultConfig }

  if (raw && typeof raw === 'object') {
    const obj = raw as Record<string, unknown>

    if (obj.theme === 'light' || obj.theme === 'dark' || obj.theme === 'system') {
      config.theme = obj.theme
    }

    if (obj.contentWidth === 'constrained' || obj.contentWidth === 'full') {
      config.contentWidth = obj.contentWidth
    }

    if (Array.isArray(obj.hidden)) {
      config.hidden = obj.hidden.filter((h): h is string => typeof h === 'string')
    }

    if (obj.order && typeof obj.order === 'object') {
      config.order = {}
      for (const [key, value] of Object.entries(obj.order)) {
        if (Array.isArray(value)) {
          config.order[key] = value.filter((v): v is string => typeof v === 'string')
        }
      }
    }

    if (typeof obj.port === 'number' && obj.port > 0 && obj.port < 65536) {
      config.port = obj.port
    }
  }

  return config
}
