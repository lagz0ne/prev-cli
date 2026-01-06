// src/vite/pages.ts
import fg from 'fast-glob'
import { readFile } from 'fs/promises'
import path from 'path'

export interface Page {
  route: string
  title: string
  file: string
}

export interface SidebarItem {
  title: string
  route?: string
  children?: SidebarItem[]
}

export function fileToRoute(file: string): string {
  const withoutExt = file.replace(/\.mdx?$/, '')

  if (withoutExt === 'index') {
    return '/'
  }

  if (withoutExt.endsWith('/index')) {
    return '/' + withoutExt.slice(0, -6)
  }

  return '/' + withoutExt
}

export async function scanPages(rootDir: string): Promise<Page[]> {
  const files = await fg.glob('**/*.{md,mdx}', {
    cwd: rootDir,
    ignore: ['node_modules/**', 'dist/**', '.cache/**']
  })

  const pages: Page[] = []

  for (const file of files) {
    const fullPath = path.join(rootDir, file)
    const content = await readFile(fullPath, 'utf-8')
    const title = extractTitle(content, file)

    pages.push({
      route: fileToRoute(file),
      title,
      file
    })
  }

  return pages.sort((a, b) => a.route.localeCompare(b.route))
}

function extractTitle(content: string, file: string): string {
  const match = content.match(/^#\s+(.+)$/m)
  if (match) {
    return match[1].trim()
  }

  const basename = path.basename(file, path.extname(file))
  if (basename === 'index') {
    const dirname = path.dirname(file)
    return dirname === '.' ? 'Home' : capitalize(path.basename(dirname))
  }

  return capitalize(basename)
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).replace(/-/g, ' ')
}

export function buildSidebarTree(pages: Page[]): SidebarItem[] {
  const tree: SidebarItem[] = []
  const map = new Map<string, SidebarItem>()

  // Add root pages first
  for (const page of pages) {
    const segments = page.route.split('/').filter(Boolean)

    if (segments.length === 0) {
      tree.push({ title: page.title, route: page.route })
    } else if (segments.length === 1) {
      const item: SidebarItem = { title: page.title, route: page.route }
      map.set(segments[0], item)
      tree.push(item)
    } else {
      // Nested page
      const parentKey = segments[0]
      let parent = map.get(parentKey)

      if (!parent) {
        parent = { title: capitalize(parentKey), children: [] }
        map.set(parentKey, parent)
        tree.push(parent)
      }

      if (!parent.children) {
        parent.children = []
      }

      parent.children.push({ title: page.title, route: page.route })
    }
  }

  return tree
}
