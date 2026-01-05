import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { sidebar } from 'virtual:prev-pages'
import { cn } from '../ui/utils'

interface SidebarItem {
  title: string
  route?: string
  children?: SidebarItem[]
}

export function Sidebar() {
  const location = useLocation()

  return (
    <aside className="w-64 border-r border-border p-4 min-h-screen sticky top-0">
      <nav>
        <ul className="space-y-1">
          {(sidebar as SidebarItem[]).map((item, i) => (
            <SidebarItemComponent
              key={i}
              item={item}
              currentPath={location.pathname}
            />
          ))}
        </ul>
      </nav>
    </aside>
  )
}

function SidebarItemComponent({
  item,
  currentPath
}: {
  item: SidebarItem
  currentPath: string
}) {
  const isActive = item.route === currentPath

  if (item.children) {
    return (
      <li>
        <span className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
          {item.title}
        </span>
        <ul className="ml-3 mt-1 space-y-1">
          {item.children.map((child, i) => (
            <SidebarItemComponent
              key={i}
              item={child}
              currentPath={currentPath}
            />
          ))}
        </ul>
      </li>
    )
  }

  return (
    <li>
      <Link
        to={item.route || '/'}
        className={cn(
          'block py-1 px-2 rounded text-sm transition-colors',
          isActive
            ? 'bg-accent text-accent-foreground font-medium'
            : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
        )}
      >
        {item.title}
      </Link>
    </li>
  )
}
