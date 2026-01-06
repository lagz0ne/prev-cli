import { useEffect } from 'react'
import { useLocation } from '@tanstack/react-router'

// Simple hash function for cache keys
function hashCode(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return hash.toString(36)
}

// In-memory cache for current session
const memoryCache = new Map<string, string>()

// Get cached SVG (memory first, then localStorage)
function getCachedSvg(type: string, code: string): string | null {
  const key = `prev-diagram-${type}-${hashCode(code)}`

  // Check memory cache first
  if (memoryCache.has(key)) {
    return memoryCache.get(key)!
  }

  // Check localStorage
  try {
    const cached = localStorage.getItem(key)
    if (cached) {
      memoryCache.set(key, cached) // Populate memory cache
      return cached
    }
  } catch {}

  return null
}

// Cache SVG (both memory and localStorage)
function cacheSvg(type: string, code: string, svg: string): void {
  const key = `prev-diagram-${type}-${hashCode(code)}`
  memoryCache.set(key, svg)
  try {
    localStorage.setItem(key, svg)
  } catch {} // Ignore quota errors
}

// Lazy-load and render mermaid diagrams
async function renderMermaidDiagrams() {
  const codeBlocks = document.querySelectorAll('code.language-mermaid, code.hljs.language-mermaid')
  if (codeBlocks.length === 0) return

  let mermaidModule: any = null

  for (const block of codeBlocks) {
    const pre = block.parentElement as HTMLElement
    if (!pre || pre.dataset.rendered) continue
    pre.dataset.rendered = 'true'

    const code = block.textContent || ''
    const container = document.createElement('div')
    container.className = 'mermaid-diagram'

    // Check cache first
    const cached = getCachedSvg('mermaid', code)
    if (cached) {
      container.innerHTML = cached
      pre.style.display = 'none'
      pre.insertAdjacentElement('afterend', container)
      continue
    }

    // Load mermaid only if needed
    if (!mermaidModule) {
      mermaidModule = await import('mermaid')
      mermaidModule.default.initialize({ startOnLoad: false, theme: 'neutral' })
    }

    try {
      const { svg } = await mermaidModule.default.render(`mermaid-${Math.random().toString(36).slice(2)}`, code)
      container.innerHTML = svg
      cacheSvg('mermaid', code, svg)
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

  let d2Instance: any = null

  for (const block of codeBlocks) {
    const pre = block.parentElement as HTMLElement
    if (!pre || pre.dataset.rendered) continue
    pre.dataset.rendered = 'true'

    const code = block.textContent || ''
    const container = document.createElement('div')
    container.className = 'd2-diagram'

    // Check cache first
    const cached = getCachedSvg('d2', code)
    if (cached) {
      container.innerHTML = cached
      pre.style.display = 'none'
      pre.insertAdjacentElement('afterend', container)
      continue
    }

    // Load D2 only if needed
    if (!d2Instance) {
      try {
        const d2Module = await import('@terrastruct/d2')
        const { D2 } = d2Module
        d2Instance = new D2()
      } catch (e) {
        console.error('D2 library load error:', e)
        return
      }
    }

    try {
      const result = await d2Instance.compile(code)
      const svg = await d2Instance.render(result.diagram, result.renderOptions)
      container.innerHTML = svg
      cacheSvg('d2', code, svg)
      pre.style.display = 'none'
      pre.insertAdjacentElement('afterend', container)
    } catch (e) {
      console.error('D2 render error:', e)
    }
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

// Hook for diagram rendering
export function useDiagrams() {
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
}
