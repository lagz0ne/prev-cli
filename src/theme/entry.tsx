import React from 'react'
import { createRoot } from 'react-dom/client'
import {
  RouterProvider,
  createRouter,
  createRootRoute,
  createRoute,
  Outlet,
} from '@tanstack/react-router'
import { pages, sidebar } from 'virtual:prev-pages'
import { useDiagrams } from './diagrams'
import { Layout } from './Layout'
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
