import React from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import './styles.css'

export function Layout() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-8 max-w-4xl animate-fade-in">
          <article className="prose max-w-none">
            <Outlet />
          </article>
        </main>
      </div>
    </div>
  )
}
