// src/vite/previews.ts
import fg from 'fast-glob'
import path from 'path'
import { existsSync } from 'fs'

export interface Preview {
  name: string
  route: string
  htmlPath: string
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
