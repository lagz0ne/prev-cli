import React, { useState, useRef, useEffect } from 'react'
import { Link } from '@tanstack/react-router'
import type { PageTree } from 'fumadocs-core/server'
import { previews } from 'virtual:prev-previews'
import './Toolbar.css'

interface ToolbarProps {
  tree: PageTree.Root
  onThemeToggle: () => void
  onWidthToggle: () => void
  isDark: boolean
  isFullWidth: boolean
  onTocToggle: () => void
  tocOpen: boolean
}

export function Toolbar({ tree, onThemeToggle, onWidthToggle, isDark, isFullWidth, onTocToggle, tocOpen }: ToolbarProps) {
  const [position, setPosition] = useState({ x: 20, y: typeof window !== 'undefined' ? window.innerHeight - 80 : 600 })
  const [dragging, setDragging] = useState(false)
  const dragStart = useRef({ x: 0, y: 0 })
  const toolbarRef = useRef<HTMLDivElement>(null)

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button, a')) return
    setDragging(true)
    dragStart.current = { x: e.clientX - position.x, y: e.clientY - position.y }
  }

  useEffect(() => {
    if (!dragging) return

    const handleMouseMove = (e: MouseEvent) => {
      setPosition({
        x: Math.max(0, Math.min(window.innerWidth - 300, e.clientX - dragStart.current.x)),
        y: Math.max(0, Math.min(window.innerHeight - 60, e.clientY - dragStart.current.y))
      })
    }

    const handleMouseUp = () => setDragging(false)

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [dragging])

  return (
    <div
      ref={toolbarRef}
      className="prev-toolbar"
      style={{ left: position.x, top: position.y }}
      onMouseDown={handleMouseDown}
    >
      <button
        className={`toolbar-btn ${tocOpen ? 'active' : ''}`}
        onClick={onTocToggle}
        title="Table of Contents"
      >
        <TocIcon />
      </button>

      {previews && previews.length > 0 && (
        <Link to="/previews" className="toolbar-btn" title="Previews">
          <PreviewsIcon />
        </Link>
      )}

      {/* Contextual devtools slot - populated by preview context */}
      <div className="toolbar-devtools-slot" id="toolbar-devtools" />

      <button
        className="toolbar-btn desktop-only"
        onClick={onWidthToggle}
        title={isFullWidth ? 'Constrain width' : 'Full width'}
      >
        {isFullWidth ? <ConstrainIcon /> : <ExpandIcon />}
      </button>

      <button
        className="toolbar-btn"
        onClick={onThemeToggle}
        title={isDark ? 'Light mode' : 'Dark mode'}
      >
        {isDark ? <SunIcon /> : <MoonIcon />}
      </button>
    </div>
  )
}

// Icon components
function TocIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 12h18M3 6h18M3 18h18" />
    </svg>
  )
}

function PreviewsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
    </svg>
  )
}

function SunIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="5"/>
      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
    </svg>
  )
}

function ExpandIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>
    </svg>
  )
}

function ConstrainIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3"/>
    </svg>
  )
}
