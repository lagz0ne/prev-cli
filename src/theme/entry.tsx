import React from 'react'
import { createRoot } from 'react-dom/client'
import {
  RouterProvider,
  createRouter,
  createRootRoute,
  createRoute,
  Outlet,
} from '@tanstack/react-router'
import { MDXProvider } from '@mdx-js/react'
import { pages, sidebar } from 'virtual:prev-pages'
import { previews } from 'virtual:prev-previews'
import { Preview } from './Preview'
import { useDiagrams } from './diagrams'
import { Layout } from './Layout'
import { MetadataBlock } from './MetadataBlock'
import { mdxComponents } from './mdx-components'
import './styles.css'

// PageTree types (simplified from fumadocs-core)
namespace PageTree {
  export interface Item {
    type: 'page'
    name: string
    url: string
  }
  export interface Folder {
    type: 'folder'
    name: string
    children: (Item | Folder)[]
  }
  export interface Root {
    name: string
    children: (Item | Folder)[]
  }
}

// Convert prev-cli sidebar to Fumadocs PageTree format
function convertToPageTree(items: any[]): PageTree.Root {
  function convertItem(item: any): PageTree.Item | PageTree.Folder {
    if (item.children) {
      return {
        type: 'folder',
        name: item.title,
        children: item.children.map(convertItem),
      }
    }
    return {
      type: 'page',
      name: item.title,
      url: item.route || '/',
    }
  }

  return {
    name: 'docs',
    children: items.map(convertItem),
  }
}

// Dynamic imports for MDX pages (include dot directories for --include flag)
const pageModules = import.meta.glob(['/**/*.{md,mdx}', '/.*/**/*.{md,mdx}'], { eager: true })

function getPageComponent(file: string): React.ComponentType | null {
  const mod = pageModules[`/${file}`] as { default: React.ComponentType } | undefined
  return mod?.default || null
}

interface PageMeta {
  title?: string
  description?: string
  frontmatter?: Record<string, unknown>
}

// Page wrapper that renders diagrams after content loads
function PageWrapper({ Component, meta }: { Component: React.ComponentType; meta: PageMeta }) {
  useDiagrams()
  return (
    <MDXProvider components={mdxComponents}>
      {meta.frontmatter && Object.keys(meta.frontmatter).length > 0 && (
        <MetadataBlock frontmatter={meta.frontmatter} />
      )}
      <Component />
    </MDXProvider>
  )
}

// Previews catalog - Storybook-like gallery
function PreviewsCatalog() {
  if (!previews || previews.length === 0) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px' }}>
          No Previews Found
        </h1>
        <p style={{ color: '#666', marginBottom: '24px' }}>
          Create your first preview with:
        </p>
        <code style={{
          display: 'inline-block',
          padding: '12px 20px',
          backgroundColor: '#f4f4f5',
          borderRadius: '8px',
          fontFamily: 'monospace',
        }}>
          prev create my-demo
        </code>
      </div>
    )
  }

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '8px' }}>
          Previews
        </h1>
        <p style={{ color: '#666' }}>
          {previews.length} component preview{previews.length !== 1 ? 's' : ''} available
        </p>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))',
        gap: '24px',
      }}>
        {previews.map((preview: { name: string; route: string }) => (
          <div key={preview.name} style={{
            border: '1px solid #e4e4e7',
            borderRadius: '12px',
            overflow: 'hidden',
            backgroundColor: '#fff',
          }}>
            <div style={{
              padding: '12px 16px',
              borderBottom: '1px solid #e4e4e7',
              backgroundColor: '#fafafa',
            }}>
              <h2 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>
                {preview.name}
              </h2>
              <code style={{
                fontSize: '12px',
                color: '#666',
                fontFamily: 'monospace',
              }}>
                previews/{preview.name}/
              </code>
            </div>
            <Preview src={preview.name} height={300} />
          </div>
        ))}
      </div>

      <div style={{
        marginTop: '40px',
        padding: '16px',
        backgroundColor: '#f0f9ff',
        border: '1px solid #bae6fd',
        borderRadius: '8px',
      }}>
        <p style={{ margin: 0, fontSize: '14px', color: '#0369a1' }}>
          <strong>Tip:</strong> Embed any preview in your MDX docs with{' '}
          <code style={{ backgroundColor: '#e0f2fe', padding: '2px 6px', borderRadius: '4px' }}>
            {'<Preview src="name" />'}
          </code>
        </p>
      </div>
    </div>
  )
}

// Root layout with custom lightweight Layout
function RootLayout() {
  const pageTree = convertToPageTree(sidebar)

  return (
    <Layout tree={pageTree}>
      <article className="prev-content">
        <Outlet />
      </article>
    </Layout>
  )
}

// Create root route
const rootRoute = createRootRoute({
  component: RootLayout,
})

// Previews catalog route
const previewsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/previews',
  component: PreviewsCatalog,
})

// Create routes from pages
const pageRoutes = pages.map((page: { route: string; file: string; title?: string; description?: string; frontmatter?: Record<string, unknown> }) => {
  const Component = getPageComponent(page.file)
  const meta: PageMeta = {
    title: page.title,
    description: page.description,
    frontmatter: page.frontmatter,
  }
  return createRoute({
    getParentRoute: () => rootRoute,
    path: page.route === '/' ? '/' : page.route,
    component: Component ? () => <PageWrapper Component={Component} meta={meta} /> : () => null,
  })
})

// Create router
const routeTree = rootRoute.addChildren([previewsRoute, ...pageRoutes])
const router = createRouter({ routeTree })

// Mount app - RouterProvider must be outermost so TanStack Router context is available
const container = document.getElementById('root')
if (container) {
  const root = createRoot(container)
  root.render(<RouterProvider router={router} />)
}
