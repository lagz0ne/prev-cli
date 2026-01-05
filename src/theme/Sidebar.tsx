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
    <aside className="w-64 border-r border-sidebar-border bg-sidebar p-4 min-h-screen sticky top-0">
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
      <li className="mt-4 first:mt-0">
        <span className="font-semibold text-xs text-sidebar-foreground/60 uppercase tracking-wider">
          {item.title}
        </span>
        <ul className="ml-3 mt-2 space-y-1">
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
          'block py-1.5 px-2 rounded-md text-sm transition-colors',
          isActive
            ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
            : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50'
        )}
      >
        {item.title}
      </Link>
    </li>
  )
}
