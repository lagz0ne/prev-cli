import React, { useState, useEffect, useRef, createContext, useContext } from 'react'
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

// Storage key for a specific path (root or folder)
function getStorageKey(path: string): string {
  return `sidebar-order:${path}`
}

// Apply saved order to items for a specific path
function applyOrder(items: TreeItem[], path: string): TreeItem[] {
  if (typeof window === 'undefined') return items

  const saved = localStorage.getItem(getStorageKey(path))
  if (!saved) return items

  const order: string[] = JSON.parse(saved)
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

// Save order for a specific path
function saveOrder(items: TreeItem[], path: string): void {
  const order = items.map(getItemId)
  localStorage.setItem(getStorageKey(path), JSON.stringify(order))
}

// Drag context for nested components
interface DragContextType {
  dragPath: string | null
  dragIndex: number | null
  dragOverPath: string | null
  dragOverIndex: number | null
  onDragStart: (path: string, index: number) => void
  onDragOver: (path: string, index: number) => void
  onDragEnd: () => void
}

const DragContext = createContext<DragContextType | null>(null)

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
  path: string
  depth?: number
}

function DraggableSidebarItem({ item, index, path, depth = 0 }: DraggableSidebarItemProps) {
  const location = useLocation()
  const [isOpen, setIsOpen] = useState(true)
  const dragCtx = useContext(DragContext)

  const handleDragStart = (e: React.DragEvent) => {
    e.stopPropagation()
    e.dataTransfer.effectAllowed = 'move'
    dragCtx?.onDragStart(path, index)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'move'
    dragCtx?.onDragOver(path, index)
  }

  const handleDragEnd = (e: React.DragEvent) => {
    e.stopPropagation()
    dragCtx?.onDragEnd()
  }

  const isDropTarget = dragCtx?.dragOverPath === path && dragCtx?.dragOverIndex === index

  if (item.type === 'folder') {
    const folderPath = `${path}/${item.name}`

    return (
      <div
        className={`sidebar-folder ${isDropTarget ? 'drop-target' : ''}`}
        draggable
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
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
          <DraggableFolderChildren
            items={item.children}
            path={folderPath}
            depth={depth + 1}
          />
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
      onDragEnd={handleDragEnd}
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

// Draggable folder children with their own order state
function DraggableFolderChildren({ items, path, depth }: { items: TreeItem[]; path: string; depth: number }) {
  const [orderedItems, setOrderedItems] = useState<TreeItem[]>(() => applyOrder(items, path))
  const dragCtx = useContext(DragContext)

  // Update when items change
  useEffect(() => {
    setOrderedItems(applyOrder(items, path))
  }, [items, path])

  // Handle reorder when drag ends in this folder
  useEffect(() => {
    if (
      dragCtx?.dragPath === path &&
      dragCtx?.dragOverPath === path &&
      dragCtx?.dragIndex !== null &&
      dragCtx?.dragOverIndex !== null &&
      dragCtx?.dragIndex !== dragCtx?.dragOverIndex
    ) {
      // Will be handled by parent's onDragEnd
    }
  }, [dragCtx, path])

  // Listen for successful drops in this path
  const prevDragCtx = useRef(dragCtx)
  useEffect(() => {
    const prev = prevDragCtx.current
    if (
      prev?.dragPath === path &&
      prev?.dragOverPath === path &&
      prev?.dragIndex !== null &&
      prev?.dragOverIndex !== null &&
      prev?.dragIndex !== prev?.dragOverIndex &&
      dragCtx?.dragPath === null // drag ended
    ) {
      const newItems = [...orderedItems]
      const [removed] = newItems.splice(prev.dragIndex, 1)
      newItems.splice(prev.dragOverIndex, 0, removed)
      setOrderedItems(newItems)
      saveOrder(newItems, path)
    }
    prevDragCtx.current = dragCtx
  }, [dragCtx, path, orderedItems])

  return (
    <div className="sidebar-folder-children">
      {orderedItems.map((child, i) => (
        <DraggableSidebarItem
          key={getItemId(child)}
          item={child}
          index={i}
          path={path}
          depth={depth}
        />
      ))}
    </div>
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

const ROOT_PATH = 'root'

export function Layout({ tree, children }: LayoutProps) {
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('sidebar-collapsed') === 'true'
    }
    return false
  })

  const [orderedItems, setOrderedItems] = useState<TreeItem[]>(() => applyOrder(tree.children, ROOT_PATH))

  const [dragPath, setDragPath] = useState<string | null>(null)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dragOverPath, setDragOverPath] = useState<string | null>(null)
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
    setOrderedItems(applyOrder(tree.children, ROOT_PATH))
  }, [tree.children])

  // Persist collapsed state
  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', String(collapsed))
  }, [collapsed])

  const toggleCollapsed = () => setCollapsed(!collapsed)

  const handleDragStart = (path: string, index: number) => {
    setDragPath(path)
    setDragIndex(index)
  }

  const handleDragOver = (path: string, index: number) => {
    // Only allow dropping in the same path (no cross-folder drops)
    if (dragPath === path && dragIndex !== index) {
      setDragOverPath(path)
      setDragOverIndex(index)
    }
  }

  const handleDragEnd = () => {
    // Handle root-level reordering
    if (
      dragPath === ROOT_PATH &&
      dragOverPath === ROOT_PATH &&
      dragIndex !== null &&
      dragOverIndex !== null &&
      dragIndex !== dragOverIndex
    ) {
      const newItems = [...orderedItems]
      const [removed] = newItems.splice(dragIndex, 1)
      newItems.splice(dragOverIndex, 0, removed)
      setOrderedItems(newItems)
      saveOrder(newItems, ROOT_PATH)
    }

    setDragPath(null)
    setDragIndex(null)
    setDragOverPath(null)
    setDragOverIndex(null)
  }

  // Get top-level folders for collapsed rail
  const topFolders = orderedItems.filter(
    (item): item is PageTree.Folder => item.type === 'folder'
  )

  const dragContextValue: DragContextType = {
    dragPath,
    dragIndex,
    dragOverPath,
    dragOverIndex,
    onDragStart: handleDragStart,
    onDragOver: handleDragOver,
    onDragEnd: handleDragEnd,
  }

  return (
    <DragContext.Provider value={dragContextValue}>
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
                    path={ROOT_PATH}
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
    </DragContext.Provider>
  )
}
