// src/vite/pages.ts
import fg from 'fast-glob'
import { readFile } from 'fs/promises'
import path from 'path'
import picomatch from 'picomatch'

export interface Frontmatter {
  title?: string
  description?: string
  [key: string]: unknown
}

export interface Page {
  route: string
  title: string
  file: string
  description?: string
  frontmatter?: Frontmatter
  hidden?: boolean
}

export interface SidebarItem {
  title: string
  route?: string
  children?: SidebarItem[]
}

/**
 * Parse a value string into typed value (string, boolean, number, or array)
 */
function parseValue(value: string): string | boolean | number | string[] {
  const trimmed = value.trim()

  // Check for inline array: [a, b, c]
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    const inner = trimmed.slice(1, -1)
    if (inner.trim() === '') return []
    return inner.split(',').map(item => {
      let v = item.trim()
      // Remove quotes from array items
      if ((v.startsWith('"') && v.endsWith('"')) ||
          (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1)
      }
      return v
    })
  }

  // Remove surrounding quotes
  let v: string | boolean | number = trimmed
  if ((v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))) {
    v = v.slice(1, -1)
  }

  // Parse booleans and numbers
  if (v === 'true') return true
  if (v === 'false') return false
  if (!isNaN(Number(v)) && v !== '') return Number(v)

  return v
}

/**
 * Parse YAML frontmatter from markdown content
 */
export function parseFrontmatter(content: string): { frontmatter: Frontmatter; content: string } {
  const frontmatterRegex = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/
  const match = content.match(frontmatterRegex)

  if (!match) {
    return { frontmatter: {}, content }
  }

  const frontmatterStr = match[1]
  const restContent = content.slice(match[0].length)
  const frontmatter: Frontmatter = {}

  // Parse simple YAML key: value pairs
  for (const line of frontmatterStr.split('\n')) {
    const colonIndex = line.indexOf(':')
    if (colonIndex === -1) continue

    const key = line.slice(0, colonIndex).trim()
    const rawValue = line.slice(colonIndex + 1)

    if (key) {
      frontmatter[key] = parseValue(rawValue)
    }
  }

  return { frontmatter, content: restContent }
}

/**
 * Check if a filename is an index file (index.md, index.mdx, README.md, readme.md)
 */
function isIndexFile(basename: string): boolean {
  const lower = basename.toLowerCase()
  return lower === 'index' || lower === 'readme'
}

export function fileToRoute(file: string): string {
  const withoutExt = file.replace(/\.mdx?$/, '')
  const basename = path.basename(withoutExt).toLowerCase()

  // Root index or readme
  if (basename === 'index' || basename === 'readme') {
    const dir = path.dirname(withoutExt)
    if (dir === '.') {
      return '/'
    }
    return '/' + dir
  }

  return '/' + withoutExt
}

export interface ScanOptions {
  include?: string[]
  hidden?: string[]
}

export async function scanPages(rootDir: string, options: ScanOptions = {}): Promise<Page[]> {
  const { include = [] } = options

  // Normalize include paths to have leading dot
  const includeDirs = include.map(dir => dir.startsWith('.') ? dir : `.${dir}`)

  // Build glob patterns
  const patterns = ['**/*.{md,mdx}']

  // Add explicit patterns for included dot directories
  for (const dir of includeDirs) {
    patterns.push(`${dir}/**/*.{md,mdx}`)
  }

  // Build ignore patterns - always ignore these, plus dot dirs not in include list
  const ignore = [
    'node_modules/**',
    'dist/**',
    '.cache/**',
    // Common non-documentation files at root
    'CLAUDE.md',
    'CHANGELOG.md',
    'CONTRIBUTING.md',
    'LICENSE.md',
    'SECURITY.md',
  ]

  const files = await fg.glob(patterns, {
    cwd: rootDir,
    ignore,
    dot: true  // Enable dot to allow our explicit dot patterns
  })

  // Filter out unwanted dot directories (not in include list)
  const filteredFiles = files.filter(file => {
    // Check if file is in a dot directory
    const parts = file.split('/')
    for (const part of parts) {
      if (part.startsWith('.') && part !== '.') {
        // This is a dot directory - only allow if in include list
        return includeDirs.some(dir => file.startsWith(dir.slice(1)) || file.startsWith(dir))
      }
    }
    return true
  })

  // Group files by route to handle index/README conflicts
  const routeMap = new Map<string, { file: string; priority: number }>()

  for (const file of filteredFiles) {
    const route = fileToRoute(file)
    const basename = path.basename(file, path.extname(file)).toLowerCase()

    // index files have higher priority than README files
    const priority = basename === 'index' ? 1 : basename === 'readme' ? 2 : 0

    const existing = routeMap.get(route)
    if (!existing || (priority > 0 && priority < existing.priority)) {
      routeMap.set(route, { file, priority })
    }
  }

  const pages: Page[] = []

  for (const { file } of routeMap.values()) {
    const fullPath = path.join(rootDir, file)
    const rawContent = await readFile(fullPath, 'utf-8')
    const { frontmatter, content } = parseFrontmatter(rawContent)
    const title = extractTitle(content, file, frontmatter)

    const page: Page = {
      route: fileToRoute(file),
      title,
      file
    }

    if (frontmatter.description) {
      page.description = frontmatter.description as string
    }

    if (Object.keys(frontmatter).length > 0) {
      page.frontmatter = frontmatter
    }

    // Check if page is hidden via frontmatter
    if (frontmatter.hidden === true) {
      page.hidden = true
    }

    pages.push(page)
  }

  return pages.sort((a, b) => a.route.localeCompare(b.route))
}

// Filter visible pages for navigation (hidden pages still accessible by URL)
export function filterVisiblePages(pages: Page[], hiddenPatterns: string[]): Page[] {
  if (hiddenPatterns.length === 0) {
    return pages.filter(p => !p.hidden)
  }

  const isMatch = picomatch(hiddenPatterns)

  return pages.filter(page => {
    if (page.hidden) return false
    return !isMatch(page.file)
  })
}

function extractTitle(content: string, file: string, frontmatter?: Frontmatter): string {
  // 1. Use frontmatter title if available
  if (frontmatter?.title && typeof frontmatter.title === 'string') {
    return frontmatter.title
  }

  // 2. Extract from first H1 heading
  const match = content.match(/^#\s+(.+)$/m)
  if (match) {
    return match[1].trim()
  }

  // 3. Use directory name for index/readme files
  const basename = path.basename(file, path.extname(file)).toLowerCase()
  if (isIndexFile(basename)) {
    const dirname = path.dirname(file)
    return dirname === '.' ? 'Home' : capitalize(path.basename(dirname))
  }

  // 4. Fallback to filename
  return capitalize(path.basename(file, path.extname(file)))
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
