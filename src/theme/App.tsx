import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Layout } from './Layout'
import { pages } from 'virtual:prev-pages'

// Dynamic imports for MDX pages
const pageModules = import.meta.glob('/**/*.mdx', { eager: true })

function getPageComponent(file: string) {
  const mod = pageModules[`/${file}`] as { default: React.ComponentType }
  return mod?.default
}

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          {pages.map((page: { route: string; file: string }) => {
            const Component = getPageComponent(page.file)
            return Component ? (
              <Route
                key={page.route}
                path={page.route}
                element={<Component />}
              />
            ) : null
          })}
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
