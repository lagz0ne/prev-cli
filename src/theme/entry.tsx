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

// Previews catalog - Storybook-like gallery with clickable cards
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
          {previews.length} component preview{previews.length !== 1 ? 's' : ''} available.
          Click any preview to open it.
        </p>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
        gap: '20px',
      }}>
        {previews.map((preview: { name: string; route: string }) => (
          <PreviewCard key={preview.name} name={preview.name} />
        ))}
      </div>

      <div style={{
        marginTop: '40px',
        padding: '16px',
        backgroundColor: 'var(--fd-muted)',
        border: '1px solid var(--fd-border)',
        borderRadius: '8px',
      }}>
        <p style={{ margin: 0, fontSize: '14px', color: 'var(--fd-muted-foreground)' }}>
          <strong>Tip:</strong> Embed any preview in your MDX docs with{' '}
          <code style={{ backgroundColor: 'var(--fd-accent)', padding: '2px 6px', borderRadius: '4px' }}>
            {'<Preview src="name" />'}
          </code>
        </p>
      </div>
    </div>
  )
}

// Individual preview card - clickable thumbnail
import { Link, useParams } from '@tanstack/react-router'

function PreviewCard({ name }: { name: string }) {
  return (
    <Link
      to={`/previews/${name}`}
      style={{
        display: 'block',
        border: '1px solid var(--fd-border)',
        borderRadius: '12px',
        overflow: 'hidden',
        backgroundColor: 'var(--fd-background)',
        textDecoration: 'none',
        color: 'inherit',
        transition: 'box-shadow 0.2s, transform 0.2s',
      }}
      onMouseOver={(e) => {
        e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.12)'
        e.currentTarget.style.transform = 'translateY(-2px)'
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.boxShadow = ''
        e.currentTarget.style.transform = ''
      }}
    >
      {/* Thumbnail preview */}
      <div style={{
        height: '180px',
        overflow: 'hidden',
        position: 'relative',
        backgroundColor: 'var(--fd-muted)',
        pointerEvents: 'none',
      }}>
        <iframe
          src={`/_preview-runtime?src=${name}`}
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            transform: 'scale(0.5)',
            transformOrigin: 'top left',
            width: '200%',
            height: '200%',
          }}
          title={name}
          loading="lazy"
        />
      </div>
      {/* Card footer */}
      <div style={{
        padding: '12px 16px',
        borderTop: '1px solid var(--fd-border)',
        backgroundColor: 'var(--fd-card)',
      }}>
        <h3 style={{ fontSize: '14px', fontWeight: 600, margin: 0 }}>
          {name}
        </h3>
        <code style={{
          fontSize: '11px',
          color: 'var(--fd-muted-foreground)',
          fontFamily: 'monospace',
        }}>
          previews/{name}/
        </code>
      </div>
    </Link>
  )
}

// Individual preview page - full view with devtools in header
function PreviewPage() {
  const { name } = useParams({ from: '/previews/$name' })
  return <Preview src={name} height="calc(100vh - 200px)" showHeader />
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

// Individual preview route
const previewDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/previews/$name',
  component: PreviewPage,
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
const routeTree = rootRoute.addChildren([previewsRoute, previewDetailRoute, ...pageRoutes])
const router = createRouter({ routeTree })

// Mount app - RouterProvider must be outermost so TanStack Router context is available
const container = document.getElementById('root')
if (container) {
  const root = createRoot(container)
  root.render(<RouterProvider router={router} />)
}
