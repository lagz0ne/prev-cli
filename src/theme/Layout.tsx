import React, { useState, useEffect } from 'react'
import type { PageTree } from 'fumadocs-core/server'
import { config } from 'virtual:prev-config'
import { Toolbar } from './Toolbar'
import { TOCPanel } from './TOCPanel'
import './Toolbar.css'
import './TOCPanel.css'

interface LayoutProps {
  tree: PageTree.Root
  children: React.ReactNode
}

export function Layout({ tree, children }: LayoutProps) {
  const [tocOpen, setTocOpen] = useState(false)

  const [isDark, setIsDark] = useState(() => {
    if (typeof window === 'undefined') return false
    if (config.theme === 'dark') return true
    if (config.theme === 'light') return false
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  const [isFullWidth, setIsFullWidth] = useState(() => {
    return config.contentWidth === 'full'
  })

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark)
  }, [isDark])

  useEffect(() => {
    document.documentElement.classList.toggle('full-width', isFullWidth)
  }, [isFullWidth])

  const handleThemeToggle = () => setIsDark(!isDark)
  const handleWidthToggle = () => setIsFullWidth(!isFullWidth)
  const handleTocToggle = () => setTocOpen(!tocOpen)

  return (
    <div className="prev-layout-floating">
      <Toolbar
        tree={tree}
        onThemeToggle={handleThemeToggle}
        onWidthToggle={handleWidthToggle}
        isDark={isDark}
        isFullWidth={isFullWidth}
        onTocToggle={handleTocToggle}
        tocOpen={tocOpen}
      />
      {tocOpen && (
        <TOCPanel
          tree={tree}
          onClose={() => setTocOpen(false)}
        />
      )}
      <main className="prev-main-floating">
        {children}
      </main>
    </div>
  )
}
