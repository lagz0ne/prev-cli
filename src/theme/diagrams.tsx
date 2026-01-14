import { useEffect } from 'react'
import { useLocation } from '@tanstack/react-router'

// Diagram controls and fullscreen functionality
function createDiagramControls(container: HTMLElement): void {
  // Skip if already has controls
  if (container.querySelector('.diagram-controls')) return

  const wrapper = document.createElement('div')
  wrapper.className = 'diagram-wrapper'

  // Move container content to wrapper
  const svg = container.querySelector('svg')
  if (!svg) return

  // Create controls
  const controls = document.createElement('div')
  controls.className = 'diagram-controls'
  controls.innerHTML = `
    <button class="diagram-btn diagram-zoom-in" title="Zoom in">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35M11 8v6M8 11h6"/>
      </svg>
    </button>
    <button class="diagram-btn diagram-zoom-out" title="Zoom out">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35M8 11h6"/>
      </svg>
    </button>
    <button class="diagram-btn diagram-fullscreen" title="Fullscreen">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3"/>
      </svg>
    </button>
  `

  // Track zoom level
  let scale = 1
  const minScale = 0.5
  const maxScale = 3
  const scaleStep = 0.25

  const updateScale = () => {
    svg.style.transform = `scale(${scale})`
    svg.style.transformOrigin = 'center center'
  }

  // Zoom in
  controls.querySelector('.diagram-zoom-in')?.addEventListener('click', (e) => {
    e.stopPropagation()
    if (scale < maxScale) {
      scale += scaleStep
      updateScale()
    }
  })

  // Zoom out
  controls.querySelector('.diagram-zoom-out')?.addEventListener('click', (e) => {
    e.stopPropagation()
    if (scale > minScale) {
      scale -= scaleStep
      updateScale()
    }
  })

  // Fullscreen
  controls.querySelector('.diagram-fullscreen')?.addEventListener('click', (e) => {
    e.stopPropagation()
    openFullscreenModal(svg.outerHTML)
  })

  // Scroll wheel zoom on container
  container.addEventListener('wheel', (e) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? -0.1 : 0.1
    scale = Math.min(Math.max(scale + delta, minScale), maxScale)
    updateScale()
  })

  container.appendChild(controls)
}

function openFullscreenModal(svgHtml: string): void {
  // Remove existing modal if any
  document.querySelector('.diagram-modal')?.remove()

  const modal = document.createElement('div')
  modal.className = 'diagram-modal'

  let scale = 1
  let translateX = 0
  let translateY = 0
  let isDragging = false
  let startX = 0
  let startY = 0

  modal.innerHTML = `
    <div class="diagram-modal-backdrop"></div>
    <div class="diagram-modal-content">
      <div class="diagram-modal-controls">
        <button class="diagram-btn modal-zoom-in" title="Zoom in">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35M11 8v6M8 11h6"/>
          </svg>
        </button>
        <button class="diagram-btn modal-zoom-out" title="Zoom out">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35M8 11h6"/>
          </svg>
        </button>
        <button class="diagram-btn modal-reset" title="Reset view">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 12a9 9 0 109-9 9.75 9.75 0 00-6.74 2.74L3 8"/><path d="M3 3v5h5"/>
          </svg>
        </button>
        <button class="diagram-btn modal-close" title="Close">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>
      <div class="diagram-modal-svg-container">
        ${svgHtml}
      </div>
    </div>
  `

  const svgContainer = modal.querySelector('.diagram-modal-svg-container') as HTMLElement
  const svg = svgContainer?.querySelector('svg') as SVGElement

  const updateTransform = () => {
    if (svg) {
      svg.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`
      svg.style.transformOrigin = 'center center'
    }
  }

  // Zoom controls
  modal.querySelector('.modal-zoom-in')?.addEventListener('click', () => {
    scale = Math.min(scale + 0.25, 5)
    updateTransform()
  })

  modal.querySelector('.modal-zoom-out')?.addEventListener('click', () => {
    scale = Math.max(scale - 0.25, 0.25)
    updateTransform()
  })

  modal.querySelector('.modal-reset')?.addEventListener('click', () => {
    scale = 1
    translateX = 0
    translateY = 0
    updateTransform()
  })

  // Close handlers
  const closeModal = () => modal.remove()
  modal.querySelector('.modal-close')?.addEventListener('click', closeModal)
  modal.querySelector('.diagram-modal-backdrop')?.addEventListener('click', closeModal)

  // Keyboard close
  const handleKeydown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      closeModal()
      document.removeEventListener('keydown', handleKeydown)
    }
  }
  document.addEventListener('keydown', handleKeydown)

  // Pan with mouse drag
  svgContainer?.addEventListener('mousedown', (e) => {
    isDragging = true
    startX = e.clientX - translateX
    startY = e.clientY - translateY
    svgContainer.style.cursor = 'grabbing'
    svgContainer.style.userSelect = 'none'
    e.preventDefault() // Prevent text selection on drag start
  })

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return
    e.preventDefault()
    translateX = e.clientX - startX
    translateY = e.clientY - startY
    updateTransform()
  })

  document.addEventListener('mouseup', () => {
    isDragging = false
    if (svgContainer) {
      svgContainer.style.cursor = 'grab'
      svgContainer.style.userSelect = ''
    }
  })

  // Mouse wheel zoom
  svgContainer?.addEventListener('wheel', (e) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? -0.1 : 0.1
    scale = Math.min(Math.max(scale + delta, 0.25), 5)
    updateTransform()
  })

  document.body.appendChild(modal)
}

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
      createDiagramControls(container)
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
      createDiagramControls(container)
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
      createDiagramControls(container)
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
      createDiagramControls(container)
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
