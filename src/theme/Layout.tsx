import React from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import './styles.css'

export function Layout() {
  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-8 max-w-4xl">
          <article className="prose prose-neutral dark:prose-invert max-w-none">
            <Outlet />
          </article>
        </main>
      </div>
    </div>
  )
}
