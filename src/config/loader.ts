import { readFileSync, existsSync, writeFileSync } from 'fs'
import path from 'path'
import yaml from 'js-yaml'
import type { PrevConfig } from './schema'
import { defaultConfig, validateConfig } from './schema'

export function findConfigFile(rootDir: string): string | null {
  const yamlPath = path.join(rootDir, '.prev.yaml')
  const ymlPath = path.join(rootDir, '.prev.yml')

  if (existsSync(yamlPath)) return yamlPath
  if (existsSync(ymlPath)) return ymlPath
  return null
}

export function loadConfig(rootDir: string): PrevConfig {
  const configPath = findConfigFile(rootDir)

  if (!configPath) {
    return defaultConfig
  }

  try {
    const content = readFileSync(configPath, 'utf-8')
    const raw = yaml.load(content)
    return validateConfig(raw)
  } catch (error) {
    console.warn(`Warning: Failed to parse ${configPath}:`, error)
    return defaultConfig
  }
}

export function saveConfig(rootDir: string, config: PrevConfig): void {
  const configPath = findConfigFile(rootDir) || path.join(rootDir, '.prev.yaml')
  const content = yaml.dump(config, {
    indent: 2,
    lineWidth: -1,
    quotingType: '"',
    forceQuotes: false
  })
  writeFileSync(configPath, content, 'utf-8')
}

export function updateOrder(rootDir: string, pathKey: string, order: string[]): void {
  const config = loadConfig(rootDir)
  config.order[pathKey] = order
  saveConfig(rootDir, config)
}
