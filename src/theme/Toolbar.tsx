import React, { useState, useRef, useEffect } from 'react'
import { Link, useLocation } from '@tanstack/react-router'
import type { PageTree } from 'fumadocs-core/server'
import { previews } from 'virtual:prev-previews'
import { IconMenu2, IconLayoutGrid, IconSun, IconMoon, IconArrowsMaximize, IconArrowsMinimize } from '@tabler/icons-react'
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
  const location = useLocation()
  const isOnPreviews = location.pathname.startsWith('/previews')

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
        <IconMenu2 size={18} />
      </button>

      {previews && previews.length > 0 && (
        <Link to="/previews" className={`toolbar-btn ${isOnPreviews ? 'active' : ''}`} title="Previews">
          <IconLayoutGrid size={18} />
        </Link>
      )}

      {/* Contextual devtools slot - populated by preview context */}
      <div className="toolbar-devtools-slot" id="toolbar-devtools" />

      <button
        className="toolbar-btn desktop-only"
        onClick={onWidthToggle}
        title={isFullWidth ? 'Constrain width' : 'Full width'}
      >
        {isFullWidth ? <IconArrowsMinimize size={18} /> : <IconArrowsMaximize size={18} />}
      </button>

      <button
        className="toolbar-btn"
        onClick={onThemeToggle}
        title={isDark ? 'Light mode' : 'Dark mode'}
      >
        {isDark ? <IconSun size={18} /> : <IconMoon size={18} />}
      </button>
    </div>
  )
}
