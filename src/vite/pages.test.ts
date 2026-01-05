// src/vite/pages.test.ts
import { test, expect, beforeEach, afterEach } from 'bun:test'
import { scanPages, fileToRoute, buildSidebarTree } from './pages'
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
