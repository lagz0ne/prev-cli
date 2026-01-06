import React from 'react'
import { createRoot } from 'react-dom/client'
import {
  RouterProvider,
  createRouter,
  createRootRoute,
  createRoute,
  Outlet,
  Link,
} from '@tanstack/react-router'
import { TanstackProvider } from 'fumadocs-core/framework/tanstack'
import { DocsLayout } from 'fumadocs-ui/layouts/docs'
import type { PageTree } from 'fumadocs-core/server'
import { pages, sidebar } from 'virtual:prev-pages'
import { useDiagrams } from './diagrams'
import 'fumadocs-ui/style.css'
import './styles.css'

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

// Dynamic imports for MDX pages
const pageModules = import.meta.glob('/**/*.mdx', { eager: true })

function getPageComponent(file: string): React.ComponentType | null {
  const mod = pageModules[`/${file}`] as { default: React.ComponentType } | undefined
  return mod?.default || null
}

// Page wrapper that renders diagrams after content loads
function PageWrapper({ Component }: { Component: React.ComponentType }) {
  useDiagrams()
  return <Component />
}

// Root layout with Fumadocs DocsLayout - TanstackProvider wraps inside router
function RootLayout() {
  const pageTree = convertToPageTree(sidebar)

  return (
    <TanstackProvider>
      <DocsLayout
        tree={pageTree}
        nav={{ enabled: false }}
      >
        <article className="prose max-w-none">
          <Outlet />
        </article>
      </DocsLayout>
    </TanstackProvider>
  )
}

// Create root route
const rootRoute = createRootRoute({
  component: RootLayout,
})

// Create routes from pages
const pageRoutes = pages.map((page: { route: string; file: string }) => {
  const Component = getPageComponent(page.file)
  return createRoute({
    getParentRoute: () => rootRoute,
    path: page.route === '/' ? '/' : page.route,
    component: Component ? () => <PageWrapper Component={Component} /> : () => null,
  })
})

// Create router
const routeTree = rootRoute.addChildren(pageRoutes)
const router = createRouter({ routeTree })

// Mount app - RouterProvider must be outermost so TanStack Router context is available
const container = document.getElementById('root')
if (container) {
  const root = createRoot(container)
  root.render(<RouterProvider router={router} />)
}
