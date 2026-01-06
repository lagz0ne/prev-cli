import React, { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import './styles.css'

// Lazy-load and render mermaid diagrams
async function renderMermaidDiagrams() {
  const codeBlocks = document.querySelectorAll('code.language-mermaid')
  if (codeBlocks.length === 0) return

  const mermaid = await import('mermaid')
  mermaid.default.initialize({ startOnLoad: false, theme: 'neutral' })

  for (const block of codeBlocks) {
    const pre = block.parentElement
    if (!pre || pre.dataset.mermaidRendered) continue

    const code = block.textContent || ''
    const container = document.createElement('div')
    container.className = 'mermaid-diagram'

    try {
      const { svg } = await mermaid.default.render(`mermaid-${Math.random().toString(36).slice(2)}`, code)
      container.innerHTML = svg
      pre.replaceWith(container)
    } catch (e) {
      console.error('Mermaid render error:', e)
    }
  }
}

export function Layout() {
  const location = useLocation()

  useEffect(() => {
    // Render mermaid after content loads
    const timer = setTimeout(renderMermaidDiagrams, 100)
    return () => clearTimeout(timer)
  }, [location.pathname])

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-8 max-w-4xl animate-fade-in">
          <article className="prose max-w-none">
            <Outlet />
          </article>
        </main>
      </div>
    </div>
  )
}
