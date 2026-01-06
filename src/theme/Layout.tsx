import React, { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import './styles.css'

// Lazy-load and render mermaid diagrams
async function renderMermaidDiagrams() {
  const codeBlocks = document.querySelectorAll('code.language-mermaid, code.hljs.language-mermaid')
  if (codeBlocks.length === 0) return

  const mermaid = await import('mermaid')
  mermaid.default.initialize({ startOnLoad: false, theme: 'neutral' })

  for (const block of codeBlocks) {
    const pre = block.parentElement as HTMLElement
    if (!pre || pre.dataset.rendered) continue
    pre.dataset.rendered = 'true'

    const code = block.textContent || ''
    const container = document.createElement('div')
    container.className = 'mermaid-diagram'

    try {
      const { svg } = await mermaid.default.render(`mermaid-${Math.random().toString(36).slice(2)}`, code)
      container.innerHTML = svg
      // Hide original instead of replacing (avoids React DOM conflicts)
      pre.style.display = 'none'
      pre.insertAdjacentElement('afterend', container)
    } catch (e) {
      console.error('Mermaid render error:', e)
    }
  }
}

// Lazy-load and render D2 diagrams
async function renderD2Diagrams() {
  const codeBlocks = document.querySelectorAll('code.language-d2, code.hljs.language-d2')
  if (codeBlocks.length === 0) return

  try {
    const d2Module = await import('@terrastruct/d2')
    const { D2 } = d2Module
    const d2 = new D2()

    for (const block of codeBlocks) {
      const pre = block.parentElement as HTMLElement
      if (!pre || pre.dataset.rendered) continue
      pre.dataset.rendered = 'true'

      const code = block.textContent || ''
      const container = document.createElement('div')
      container.className = 'd2-diagram'

      try {
        const result = await d2.compile(code)
        const svg = await d2.render(result.diagram, result.renderOptions)
        container.innerHTML = svg
        // Hide original instead of replacing (avoids React DOM conflicts)
        pre.style.display = 'none'
        pre.insertAdjacentElement('afterend', container)
      } catch (e) {
        console.error('D2 render error:', e)
      }
    }
  } catch (e) {
    console.error('D2 library load error:', e)
  }
}

// Clean up rendered diagrams (for navigation)
function cleanupDiagrams() {
  // Remove all rendered diagram containers
  document.querySelectorAll('.mermaid-diagram, .d2-diagram').forEach(el => el.remove())
  // Reset rendered state on pre elements and restore visibility
  document.querySelectorAll('pre[data-rendered="true"]').forEach(el => {
    delete (el as HTMLElement).dataset.rendered;
    (el as HTMLElement).style.display = ''
  })
}

// Render all diagrams
async function renderDiagrams() {
  await Promise.all([
    renderMermaidDiagrams(),
    renderD2Diagrams()
  ])
}

export function Layout() {
  const location = useLocation()

  useEffect(() => {
    // Clean up old diagrams before rendering new ones
    cleanupDiagrams()
    // Render diagrams after content loads
    const timer = setTimeout(renderDiagrams, 100)
    return () => {
      clearTimeout(timer)
      cleanupDiagrams()
    }
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
