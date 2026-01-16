import React from 'react'
import { createRoot } from 'react-dom/client'
import {
  RouterProvider,
  createRouter,
  createRootRoute,
  createRoute,
  Outlet,
  redirect,
  Navigate,
  useLocation,
  useParams,
  Link,
} from '@tanstack/react-router'
import { MDXProvider } from '@mdx-js/react'
import { pages, sidebar } from 'virtual:prev-pages'
import { previews } from 'virtual:prev-previews'
import { Preview } from './Preview'
import { useDiagrams } from './diagrams'
import { Layout } from './Layout'
import { MetadataBlock } from './MetadataBlock'
import { mdxComponents } from './mdx-components'
import { DevToolsProvider } from './DevToolsContext'
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

// Individual preview card - clickable thumbnail with WASM preview communication
import type { PreviewConfig, PreviewMessage } from '../preview-runtime/types'

function PreviewCard({ name }: { name: string }) {
  const iframeRef = React.useRef<HTMLIFrameElement>(null)
  const [isLoaded, setIsLoaded] = React.useState(false)

  // In production, use pre-built static files; in dev, use WASM runtime
  const isDev = import.meta.env?.DEV ?? false
  const previewUrl = isDev ? `/_preview-runtime?src=${name}` : `/_preview/${name}/`

  // Set up WASM preview communication for thumbnail (dev mode only)
  React.useEffect(() => {
    if (!isDev) {
      // In production, just mark as loaded when iframe loads
      const iframe = iframeRef.current
      if (iframe) {
        iframe.onload = () => setIsLoaded(true)
      }
      return
    }

    const iframe = iframeRef.current
    if (!iframe) return

    let configSent = false

    const handleMessage = (event: MessageEvent) => {
      const msg = event.data as PreviewMessage

      if (msg.type === 'ready' && !configSent) {
        configSent = true

        fetch(`/_preview-config/${name}`)
          .then(res => res.json())
          .then((config: PreviewConfig) => {
            iframe.contentWindow?.postMessage({ type: 'init', config } as PreviewMessage, '*')
          })
          .catch(() => {
            // Silently fail for thumbnails
          })
      }

      if (msg.type === 'built') {
        setIsLoaded(true)
      }
    }

    window.addEventListener('message', handleMessage)

    return () => {
      window.removeEventListener('message', handleMessage)
    }
  }, [name, isDev])

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
        {/* Loading spinner */}
        {!isLoaded && (
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'var(--fd-muted)',
            zIndex: 1,
          }}>
            <div style={{
              width: '24px',
              height: '24px',
              border: '2px solid var(--fd-border)',
              borderTopColor: 'var(--fd-primary)',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
            }} />
          </div>
        )}
        <iframe
          ref={iframeRef}
          src={previewUrl}
          style={{
            border: 'none',
            transform: 'scale(0.5)',
            transformOrigin: 'top left',
            width: '200%',
            height: '200%',
            opacity: isLoaded ? 1 : 0,
            transition: 'opacity 0.3s',
          }}
          title={name}
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

// Individual preview page - full view with devtools in toolbar
function PreviewPage() {
  const params = useParams({ strict: false })
  // Splat param captures the full path after /previews/
  const name = (params as any)['_splat'] || (params as any)['*'] || params.name as string

  if (!name) {
    return <Navigate to="/previews" />
  }

  return (
    <div className="preview-detail-page">
      <Preview src={name} height="100%" showHeader />
    </div>
  )
}

// Root layout with custom lightweight Layout
function RootLayout() {
  const pageTree = convertToPageTree(sidebar)
  const location = useLocation()
  const isPreviewDetail = location.pathname.startsWith('/previews/') && location.pathname !== '/previews'

  // Preview detail page gets full viewport layout
  if (isPreviewDetail) {
    return (
      <Layout tree={pageTree}>
        <Outlet />
      </Layout>
    )
  }

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

// Previews layout route (just passes through to children)
const previewsLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/previews',
  component: () => <Outlet />,
})

// Previews catalog route (index)
const previewsCatalogRoute = createRoute({
  getParentRoute: () => previewsLayoutRoute,
  path: '/',
  component: PreviewsCatalog,
})

// Individual preview route (splat captures nested paths like buttons/primary)
const previewDetailRoute = createRoute({
  getParentRoute: () => previewsLayoutRoute,
  path: '$',
  component: PreviewPage,
})

// Check if we have an index page (route '/')
const hasIndexPage = pages.some((page: { route: string }) => page.route === '/')
const firstPage = pages[0] as { route: string; file: string; title?: string; description?: string; frontmatter?: Record<string, unknown> } | undefined

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

// If no index page exists, create a redirect from '/' to the first page
const indexRedirectRoute = !hasIndexPage && firstPage ? createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: () => <Navigate to={firstPage.route} />,
}) : null

// Not found component - redirect to first page or index
function NotFoundPage() {
  const targetRoute = firstPage?.route || '/'
  return <Navigate to={targetRoute} />
}

// Create router with notFoundRoute
// Previews routes: layout with catalog (index) and detail (splat) children
const previewsRouteWithChildren = previewsLayoutRoute.addChildren([
  previewsCatalogRoute,
  previewDetailRoute,
])

const routeTree = rootRoute.addChildren([
  previewsRouteWithChildren,
  ...(indexRedirectRoute ? [indexRedirectRoute] : []),
  ...pageRoutes,
])
const router = createRouter({
  routeTree,
  defaultNotFoundComponent: NotFoundPage,
})

// Mount app - RouterProvider must be outermost so TanStack Router context is available
const container = document.getElementById('root')
if (container) {
  const root = createRoot(container)
  root.render(
    <DevToolsProvider>
      <RouterProvider router={router} />
    </DevToolsProvider>
  )
}
