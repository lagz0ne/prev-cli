import React, { useState, useEffect, useRef } from 'react'
import { Link, useLocation } from '@tanstack/react-router'
import type { PageTree } from 'fumadocs-core/server'
import { IconX, IconChevronRight, IconFile, IconFolder } from '@tabler/icons-react'

interface TOCPanelProps {
  tree: PageTree.Root
  onClose: () => void
}

type TreeItem = PageTree.Item | PageTree.Folder

function getItemId(item: TreeItem): string {
  return item.type === 'folder' ? `folder:${item.name}` : item.url
}

export function TOCPanel({ tree, onClose }: TOCPanelProps) {
  const location = useLocation()
  const panelRef = useRef<HTMLDivElement>(null)
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth <= 768 : false)
  const [orderedItems, setOrderedItems] = useState<TreeItem[]>(tree.children)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [onClose])

  const handleDragStart = (index: number) => {
    setDragIndex(index)
  }

  const handleDragOver = (index: number) => {
    if (dragIndex !== null && dragIndex !== index) {
      setDragOverIndex(index)
    }
  }

  const handleDragEnd = async () => {
    if (dragIndex !== null && dragOverIndex !== null && dragIndex !== dragOverIndex) {
      const newItems = [...orderedItems]
      const [removed] = newItems.splice(dragIndex, 1)
      newItems.splice(dragOverIndex, 0, removed)
      setOrderedItems(newItems)

      // Auto-save to config
      const order = newItems.map(item =>
        item.type === 'folder' ? `${item.name}/` : item.url.replace(/^\//, '') + '.md'
      )

      await fetch('/__prev/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: '/', order })
      })
    }
    setDragIndex(null)
    setDragOverIndex(null)
  }

  if (isMobile) {
    return (
      <div className="toc-overlay">
        <div className="toc-overlay-content" ref={panelRef}>
          <div className="toc-overlay-header">
            <span>Navigation</span>
            <button className="toc-close-btn" onClick={onClose}><IconX size={16} /></button>
          </div>
          <nav className="toc-nav">
            {orderedItems.map((item) => (
              <TOCItem
                key={getItemId(item)}
                item={item}
                location={location}
                onNavigate={onClose}
              />
            ))}
          </nav>
        </div>
      </div>
    )
  }

  return (
    <div className="toc-dropdown" ref={panelRef}>
      <div className="toc-dropdown-header">
        <span>Navigation</span>
        <button className="toc-close-btn" onClick={onClose}><IconX size={16} /></button>
      </div>
      <nav className="toc-nav">
        {orderedItems.map((item, i) => (
          <div
            key={getItemId(item)}
            draggable
            onDragStart={() => handleDragStart(i)}
            onDragOver={(e) => { e.preventDefault(); handleDragOver(i) }}
            onDragEnd={handleDragEnd}
            className={dragOverIndex === i ? 'drop-target' : ''}
          >
            <TOCItem
              item={item}
              location={location}
              onNavigate={onClose}
            />
          </div>
        ))}
      </nav>
    </div>
  )
}

interface TOCItemProps {
  item: TreeItem
  location: { pathname: string }
  onNavigate: () => void
  depth?: number
}

function TOCItem({ item, location, onNavigate, depth = 0 }: TOCItemProps) {
  const [isOpen, setIsOpen] = useState(true)

  if (item.type === 'folder') {
    return (
      <div className="toc-folder">
        <button
          className="toc-folder-toggle"
          onClick={() => setIsOpen(!isOpen)}
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
        >
          <IconChevronRight size={14} className={`folder-chevron ${isOpen ? 'open' : ''}`} />
          <IconFolder size={14} className="toc-icon" />
          {item.name}
        </button>
        {isOpen && (
          <div className="toc-folder-children">
            {item.children.map((child) => (
              <TOCItem
                key={getItemId(child)}
                item={child}
                location={location}
                onNavigate={onNavigate}
                depth={depth + 1}
              />
            ))}
          </div>
        )}
      </div>
    )
  }

  const isActive = location.pathname === item.url

  return (
    <Link
      to={item.url}
      className={`toc-link ${isActive ? 'active' : ''}`}
      style={{ paddingLeft: `${depth * 12 + 12}px` }}
      onClick={onNavigate}
    >
      <IconFile size={14} className="toc-icon" />
      {item.name}
    </Link>
  )
}
