// src/vite/pages.test.ts
import { test, expect, beforeEach, afterEach } from 'bun:test'
import { scanPages, fileToRoute, buildSidebarTree, parseFrontmatter } from './pages'
import { mkdir, rm, writeFile } from 'fs/promises'
import path from 'path'
import os from 'os'

const testDir = path.join(os.tmpdir(), 'prev-pages-test')

beforeEach(async () => {
  await mkdir(testDir, { recursive: true })
})

afterEach(async () => {
  await rm(testDir, { recursive: true, force: true })
})

test('fileToRoute converts index.mdx to /', () => {
  expect(fileToRoute('index.mdx')).toBe('/')
})

test('fileToRoute converts guide/intro.mdx to /guide/intro', () => {
  expect(fileToRoute('guide/intro.mdx')).toBe('/guide/intro')
})

test('fileToRoute converts guide/index.mdx to /guide', () => {
  expect(fileToRoute('guide/index.mdx')).toBe('/guide')
})

test('fileToRoute converts README.md to /', () => {
  expect(fileToRoute('README.md')).toBe('/')
})

test('fileToRoute converts guide/README.md to /guide', () => {
  expect(fileToRoute('guide/README.md')).toBe('/guide')
})

test('fileToRoute is case-insensitive for readme', () => {
  expect(fileToRoute('readme.md')).toBe('/')
  expect(fileToRoute('Readme.md')).toBe('/')
})

test('scanPages finds all mdx files', async () => {
  await writeFile(path.join(testDir, 'index.mdx'), '# Home')
  await mkdir(path.join(testDir, 'guide'), { recursive: true })
  await writeFile(path.join(testDir, 'guide', 'intro.mdx'), '# Intro')

  const pages = await scanPages(testDir)

  expect(pages.length).toBe(2)
  expect(pages.map(p => p.route).sort()).toEqual(['/', '/guide/intro'])
})

test('buildSidebarTree creates nested structure', () => {
  const pages = [
    { route: '/', title: 'Home', file: 'index.mdx' },
    { route: '/guide', title: 'Guide', file: 'guide/index.mdx' },
    { route: '/guide/intro', title: 'Intro', file: 'guide/intro.mdx' },
  ]

  const tree = buildSidebarTree(pages)

  expect(tree.length).toBeGreaterThan(0)
})

// Frontmatter tests
test('parseFrontmatter extracts title and description', () => {
  const content = `---
title: My Custom Title
description: This is a description
---

# Heading

Content here`

  const result = parseFrontmatter(content)

  expect(result.frontmatter.title).toBe('My Custom Title')
  expect(result.frontmatter.description).toBe('This is a description')
  expect(result.content).toContain('# Heading')
  expect(result.content).not.toContain('---')
})

test('parseFrontmatter handles quoted values', () => {
  const content = `---
title: "Title with: colon"
description: 'Single quoted'
---

Content`

  const result = parseFrontmatter(content)

  expect(result.frontmatter.title).toBe('Title with: colon')
  expect(result.frontmatter.description).toBe('Single quoted')
})

test('parseFrontmatter parses booleans and numbers', () => {
  const content = `---
draft: true
published: false
order: 42
---

Content`

  const result = parseFrontmatter(content)

  expect(result.frontmatter.draft).toBe(true)
  expect(result.frontmatter.published).toBe(false)
  expect(result.frontmatter.order).toBe(42)
})

test('parseFrontmatter returns empty frontmatter for content without frontmatter', () => {
  const content = `# Just a Heading

Some content`

  const result = parseFrontmatter(content)

  expect(Object.keys(result.frontmatter).length).toBe(0)
  expect(result.content).toBe(content)
})

test('scanPages uses frontmatter title', async () => {
  const content = `---
title: Custom Title
description: A description
---

# Ignored Heading

Content`

  await writeFile(path.join(testDir, 'page.md'), content)

  const pages = await scanPages(testDir)

  expect(pages.length).toBe(1)
  expect(pages[0].title).toBe('Custom Title')
  expect(pages[0].description).toBe('A description')
  expect(pages[0].frontmatter?.title).toBe('Custom Title')
})

test('scanPages picks up README.md as index', async () => {
  await writeFile(path.join(testDir, 'README.md'), '# Welcome')

  const pages = await scanPages(testDir)

  expect(pages.length).toBe(1)
  expect(pages[0].route).toBe('/')
  expect(pages[0].title).toBe('Welcome')
})

test('scanPages prefers index over README when both exist', async () => {
  await writeFile(path.join(testDir, 'index.md'), '# Home Page')
  await writeFile(path.join(testDir, 'README.md'), '# Readme Title')

  const pages = await scanPages(testDir)

  expect(pages.length).toBe(1)
  expect(pages[0].route).toBe('/')
  expect(pages[0].title).toBe('Home Page')
  expect(pages[0].file).toBe('index.md')
})

test('scanPages picks up README.md in subdirectory', async () => {
  await mkdir(path.join(testDir, 'guide'), { recursive: true })
  await writeFile(path.join(testDir, 'guide', 'README.md'), '# Guide')

  const pages = await scanPages(testDir)

  expect(pages.length).toBe(1)
  expect(pages[0].route).toBe('/guide')
  expect(pages[0].title).toBe('Guide')
})
