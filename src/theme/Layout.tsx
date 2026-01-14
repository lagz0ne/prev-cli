import React, { useState, useEffect } from 'react'
import { Link, useLocation } from '@tanstack/react-router'
import type { PageTree } from 'fumadocs-core/server'

interface LayoutProps {
  tree: PageTree.Root
  children: React.ReactNode
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

interface SidebarItemProps {
  item: PageTree.Item | PageTree.Folder
  depth?: number
}

function SidebarItem({ item, depth = 0 }: SidebarItemProps) {
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

export function Layout({ tree, children }: LayoutProps) {
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('sidebar-collapsed') === 'true'
    }
    return false
  })

  // Initialize theme from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('theme')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const isDark = saved === 'dark' || (!saved && prefersDark)
    document.documentElement.classList.toggle('dark', isDark)
  }, [])

  // Persist collapsed state
  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', String(collapsed))
  }, [collapsed])

  const toggleCollapsed = () => setCollapsed(!collapsed)

  // Get top-level folders for collapsed rail
  const topFolders = tree.children.filter(
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
              {tree.children.map((item, i) => (
                <SidebarItem key={i} item={item} />
              ))}
            </nav>
            <div className="sidebar-footer">
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
