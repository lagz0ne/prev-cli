// src/vite/previews.ts
import fg from 'fast-glob'
import path from 'path'
import { existsSync, readFileSync } from 'fs'
import type { PreviewFile, PreviewConfig } from '../preview-runtime/types'

export interface Preview {
  name: string
  route: string
  htmlPath: string
}

export interface PreviewWithFiles extends Preview {
  files: PreviewFile[]
  entry: string
}

export async function scanPreviews(rootDir: string): Promise<Preview[]> {
  const previewsDir = path.join(rootDir, 'previews')

  if (!existsSync(previewsDir)) {
    return []
  }

  const htmlFiles = await fg.glob('**/index.html', {
    cwd: previewsDir,
    ignore: ['node_modules/**']
  })

  return htmlFiles.map(file => {
    const dir = path.dirname(file)
    const name = dir === '.' ? path.basename(path.dirname(path.join(previewsDir, file))) : dir

    return {
      name,
      route: `/_preview/${name}`,
      htmlPath: path.join(previewsDir, file)
    }
  })
}

/**
 * Scan all files in a preview directory for WASM bundling
 */
export async function scanPreviewFiles(previewDir: string): Promise<PreviewFile[]> {
  const files = await fg.glob('**/*.{tsx,ts,jsx,js,css,json}', {
    cwd: previewDir,
    ignore: ['node_modules/**', 'dist/**']
  })

  return files.map(file => {
    const content = readFileSync(path.join(previewDir, file), 'utf-8')
    const ext = path.extname(file).slice(1) as PreviewFile['type']

    return {
      path: file,
      content,
      type: ext,
    }
  })
}

/**
 * Detect the entry file for a preview (looks for App.tsx, index.tsx, etc.)
 */
export function detectEntry(files: PreviewFile[]): string {
  const priorities = ['App.tsx', 'App.jsx', 'index.tsx', 'index.jsx', 'main.tsx', 'main.jsx']

  for (const name of priorities) {
    const file = files.find(f => f.path === name)
    if (file) return file.path
  }

  // Fallback to first TSX/JSX file
  const jsxFile = files.find(f => f.type === 'tsx' || f.type === 'jsx')
  return jsxFile?.path || files[0]?.path || 'App.tsx'
}

/**
 * Build a PreviewConfig for WASM runtime
 */
export async function buildPreviewConfig(previewDir: string): Promise<PreviewConfig> {
  const files = await scanPreviewFiles(previewDir)
  const entry = detectEntry(files)

  return {
    files,
    entry,
    tailwind: true,
  }
}
