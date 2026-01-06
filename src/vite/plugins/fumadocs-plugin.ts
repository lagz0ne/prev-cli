// src/vite/plugins/fumadocs-plugin.ts
import type { Plugin } from 'vite'
import path from 'path'
import { existsSync } from 'fs'

/**
 * Vite plugin to resolve fumadocs subpath exports.
 *
 * Fumadocs uses Node.js subpath exports which Vite's esbuild pre-bundler
 * can't resolve when packages are in CLI's node_modules (not user's project).
 * This plugin uses resolveId hook to dynamically resolve imports to dist files.
 */
export function fumadocsPlugin(nodeModulesPath: string): Plugin {
  const fumadocsCorePath = path.join(nodeModulesPath, 'fumadocs-core')
  const fumadocsUiPath = path.join(nodeModulesPath, 'fumadocs-ui')
  const fumadocsUiScopedPath = path.join(nodeModulesPath, '@fumadocs/ui')

  // Helper to resolve a fumadocs subpath import
  function resolveSubpath(pkgPath: string, subpath: string): string | null {
    // Try subpath.js first
    const directPath = path.join(pkgPath, 'dist', `${subpath}.js`)
    if (existsSync(directPath)) {
      return directPath
    }

    // Try subpath/index.js
    const indexPath = path.join(pkgPath, 'dist', subpath, 'index.js')
    if (existsSync(indexPath)) {
      return indexPath
    }

    // Try just subpath (for CSS files, etc.)
    const rawPath = path.join(pkgPath, 'dist', subpath)
    if (existsSync(rawPath)) {
      return rawPath
    }

    return null
  }

  return {
    name: 'fumadocs-resolver',
    enforce: 'pre',

    resolveId(id, importer) {
      // Handle relative imports within fumadocs packages to ensure single instances
      if (importer && (id.startsWith('./') || id.startsWith('../'))) {
        // Check if importer is within fumadocs packages
        if (importer.includes('fumadocs-core') || importer.includes('fumadocs-ui') || importer.includes('@fumadocs')) {
          // Resolve relative to importer
          const importerDir = path.dirname(importer)
          const resolved = path.resolve(importerDir, id)
          // Ensure it has .js extension
          const withExt = resolved.endsWith('.js') ? resolved : `${resolved}.js`
          if (existsSync(withExt)) {
            return withExt
          }
          // Try index.js
          const indexPath = path.join(resolved, 'index.js')
          if (existsSync(indexPath)) {
            return indexPath
          }
        }
      }

      // Handle fumadocs-core subpath imports
      if (id.startsWith('fumadocs-core/')) {
        const subpath = id.slice('fumadocs-core/'.length)
        const resolved = resolveSubpath(fumadocsCorePath, subpath)
        if (resolved) {
          // Return the resolved path - Vite will dedupe based on this
          return resolved
        }
      }

      // Handle fumadocs-ui subpath imports
      if (id.startsWith('fumadocs-ui/')) {
        const subpath = id.slice('fumadocs-ui/'.length)
        const resolved = resolveSubpath(fumadocsUiPath, subpath)
        if (resolved) {
          return resolved
        }
      }

      // Handle @fumadocs/ui subpath imports
      if (id.startsWith('@fumadocs/ui/')) {
        const subpath = id.slice('@fumadocs/ui/'.length)
        const resolved = resolveSubpath(fumadocsUiScopedPath, subpath)
        if (resolved) {
          return resolved
        }
      }

      return null
    }
  }
}
