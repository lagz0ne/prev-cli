// src/preview-runtime/types.ts

export interface PreviewFile {
  path: string
  content: string
  type: 'tsx' | 'ts' | 'jsx' | 'js' | 'css' | 'html' | 'json'
}

export interface PreviewConfig {
  files: PreviewFile[]
  entry: string // Entry file path (e.g., "index.tsx" or "App.tsx")
  tailwind?: boolean // Enable Tailwind CSS v4 CDN
}

export interface BuildResult {
  success: boolean
  code?: string
  css?: string
  error?: string
  buildTime?: number
}

// Message protocol between parent and iframe
export type PreviewMessage =
  | { type: 'init'; config: PreviewConfig }
  | { type: 'update'; files: PreviewFile[] }
  | { type: 'ready' }
  | { type: 'built'; result: BuildResult }
  | { type: 'error'; error: string }
