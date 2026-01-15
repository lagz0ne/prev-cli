import React, { useState, useEffect, useRef } from 'react'
import { Link, useLocation } from '@tanstack/react-router'
import type { PageTree } from 'fumadocs-core/server'

interface LayoutProps {
  tree: PageTree.Root
  children: React.ReactNode
}

type TreeItem = PageTree.Item | PageTree.Folder

// Get unique ID for a tree item
function getItemId(item: TreeItem): string {
  return item.type === 'folder' ? `folder:${item.name}` : item.url
}

// Apply saved order to items
function applyOrder(items: TreeItem[], order: string[]): TreeItem[] {
  if (order.length === 0) return items

  const itemMap = new Map(items.map(item => [getItemId(item), item]))
  const ordered: TreeItem[] = []

  // Add items in saved order
  for (const id of order) {
    const item = itemMap.get(id)
    if (item) {
      ordered.push(item)
      itemMap.delete(id)
    }
  }

  // Add remaining items (new ones not in saved order)
  for (const item of itemMap.values()) {
    ordered.push(item)
  }

  return ordered
}

function SidebarToggle({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  return (
    <button
      className="sidebar-toggle"
      onClick={onToggle}
      aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
    >
      {collapsed ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 12h18M3 6h18M3 18h18" />
        </svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M11 19l-7-7 7-7M18 19l-7-7 7-7" />
        </svg>
      )}
    </button>
  )
}

function CollapsedFolderIcon({ item, onClick }: { item: PageTree.Folder; onClick: () => void }) {
  return (
    <button
      className="sidebar-rail-icon"
      onClick={onClick}
      title={item.name}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
      </svg>
    </button>
  )
}

interface DraggableSidebarItemProps {
  item: TreeItem
  index: number
  depth?: number
  onDragStart: (index: number) => void
  onDragOver: (index: number) => void
  onDragEnd: () => void
  isDragging: boolean
  dragOverIndex: number | null
}

function DraggableSidebarItem({
  item,
  index,
  depth = 0,
  onDragStart,
  onDragOver,
  onDragEnd,
  isDragging,
  dragOverIndex
}: DraggableSidebarItemProps) {
  const location = useLocation()
  const [isOpen, setIsOpen] = useState(true)

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = 'move'
    onDragStart(index)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    onDragOver(index)
  }

  const isDropTarget = dragOverIndex === index

  if (item.type === 'folder') {
    return (
      <div
        className={`sidebar-folder ${isDropTarget ? 'drop-target' : ''}`}
        draggable
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={onDragEnd}
      >
        <button
          className="sidebar-folder-toggle"
          onClick={() => setIsOpen(!isOpen)}
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
        >
          <span className="drag-handle">⠿</span>
          <span className={`folder-icon ${isOpen ? 'open' : ''}`}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
              <path d="M4.5 2L8.5 6L4.5 10" stroke="currentColor" strokeWidth="1.5" fill="none"/>
            </svg>
          </span>
          {item.name}
        </button>
        {isOpen && (
          <div className="sidebar-folder-children">
            {item.children.map((child, i) => (
              <SidebarItem key={i} item={child} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    )
  }

  const isActive = location.pathname === item.url ||
    (item.url === '/' && location.pathname === '/')

  return (
    <div
      className={`sidebar-item-wrapper ${isDropTarget ? 'drop-target' : ''}`}
      draggable
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={onDragEnd}
    >
      <Link
        to={item.url}
        className={`sidebar-link ${isActive ? 'active' : ''}`}
        style={{ paddingLeft: `${depth * 12 + 16}px` }}
      >
        <span className="drag-handle">⠿</span>
        {item.name}
      </Link>
    </div>
  )
}

// Non-draggable version for nested items
function SidebarItem({ item, depth = 0 }: { item: TreeItem; depth?: number }) {
  const location = useLocation()
  const [isOpen, setIsOpen] = useState(true)

  if (item.type === 'folder') {
    return (
      <div className="sidebar-folder">
        <button
          className="sidebar-folder-toggle"
          onClick={() => setIsOpen(!isOpen)}
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
        >
          <span className={`folder-icon ${isOpen ? 'open' : ''}`}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
              <path d="M4.5 2L8.5 6L4.5 10" stroke="currentColor" strokeWidth="1.5" fill="none"/>
            </svg>
          </span>
          {item.name}
        </button>
        {isOpen && (
          <div className="sidebar-folder-children">
            {item.children.map((child, i) => (
              <SidebarItem key={i} item={child} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    )
  }

  const isActive = location.pathname === item.url ||
    (item.url === '/' && location.pathname === '/')

  return (
    <Link
      to={item.url}
      className={`sidebar-link ${isActive ? 'active' : ''}`}
      style={{ paddingLeft: `${depth * 12 + 16}px` }}
    >
      {item.name}
    </Link>
  )
}

function ThemeToggle() {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark')
    }
    return false
  })

  const toggle = () => {
    const newDark = !isDark
    setIsDark(newDark)
    document.documentElement.classList.toggle('dark', newDark)
    localStorage.setItem('theme', newDark ? 'dark' : 'light')
  }

  return (
    <button className="theme-toggle" onClick={toggle} aria-label="Toggle theme">
      {isDark ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="5"/>
          <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
        </svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
        </svg>
      )}
    </button>
  )
}

function WidthToggle() {
  const [isFullWidth, setIsFullWidth] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('content-full-width') === 'true'
    }
    return false
  })

  useEffect(() => {
    document.documentElement.classList.toggle('full-width', isFullWidth)
  }, [isFullWidth])

  const toggle = () => {
    const newFullWidth = !isFullWidth
    setIsFullWidth(newFullWidth)
    localStorage.setItem('content-full-width', String(newFullWidth))
  }

  return (
    <button className="theme-toggle" onClick={toggle} aria-label="Toggle content width">
      {isFullWidth ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3"/>
        </svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>
        </svg>
      )}
    </button>
  )
}

export function Layout({ tree, children }: LayoutProps) {
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('sidebar-collapsed') === 'true'
    }
    return false
  })

  const [orderedItems, setOrderedItems] = useState<TreeItem[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sidebar-order')
      const order = saved ? JSON.parse(saved) : []
      return applyOrder(tree.children, order)
    }
    return tree.children
  })

  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  // Initialize theme from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('theme')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const isDark = saved === 'dark' || (!saved && prefersDark)
    document.documentElement.classList.toggle('dark', isDark)
  }, [])

  // Update ordered items when tree changes
  useEffect(() => {
    const saved = localStorage.getItem('sidebar-order')
    const order = saved ? JSON.parse(saved) : []
    setOrderedItems(applyOrder(tree.children, order))
  }, [tree.children])

  // Persist collapsed state
  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', String(collapsed))
  }, [collapsed])

  const toggleCollapsed = () => setCollapsed(!collapsed)

  const handleDragStart = (index: number) => {
    setDragIndex(index)
  }

  const handleDragOver = (index: number) => {
    if (dragIndex !== null && dragIndex !== index) {
      setDragOverIndex(index)
    }
  }

  const handleDragEnd = () => {
    if (dragIndex !== null && dragOverIndex !== null && dragIndex !== dragOverIndex) {
      const newItems = [...orderedItems]
      const [removed] = newItems.splice(dragIndex, 1)
      newItems.splice(dragOverIndex, 0, removed)
      setOrderedItems(newItems)

      // Save order to localStorage
      const order = newItems.map(getItemId)
      localStorage.setItem('sidebar-order', JSON.stringify(order))
    }
    setDragIndex(null)
    setDragOverIndex(null)
  }

  // Get top-level folders for collapsed rail
  const topFolders = orderedItems.filter(
    (item): item is PageTree.Folder => item.type === 'folder'
  )

  return (
    <div className={`prev-layout ${collapsed ? 'sidebar-collapsed' : ''}`}>
      <aside className="prev-sidebar">
        <div className="sidebar-header">
          <SidebarToggle collapsed={collapsed} onToggle={toggleCollapsed} />
        </div>
        {collapsed ? (
          <div className="sidebar-rail">
            {topFolders.map((folder, i) => (
              <CollapsedFolderIcon
                key={i}
                item={folder}
                onClick={toggleCollapsed}
              />
            ))}
          </div>
        ) : (
          <>
            <nav className="sidebar-nav">
              {orderedItems.map((item, i) => (
                <DraggableSidebarItem
                  key={getItemId(item)}
                  item={item}
                  index={i}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDragEnd={handleDragEnd}
                  isDragging={dragIndex === i}
                  dragOverIndex={dragOverIndex}
                />
              ))}
            </nav>
            <div className="sidebar-footer">
              <WidthToggle />
              <ThemeToggle />
            </div>
          </>
        )}
      </aside>
      <main className="prev-main">
        {children}
      </main>
    </div>
  )
}
