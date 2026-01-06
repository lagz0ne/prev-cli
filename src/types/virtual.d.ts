declare module 'virtual:prev-pages' {
  export interface Page {
    route: string
    title: string
    file: string
  }

  export interface SidebarItem {
    title: string
    route?: string
    children?: SidebarItem[]
  }

  export const pages: Page[]
  export const sidebar: SidebarItem[]
}

declare module '*.mdx' {
  import type { ComponentType } from 'react'
  const component: ComponentType
  export default component
}

declare module '*.md' {
  import type { ComponentType } from 'react'
  const component: ComponentType
  export default component
}

// Vite's import.meta.glob support
interface ImportMeta {
  glob<T = unknown>(
    pattern: string,
    options?: { eager?: boolean; import?: string }
  ): Record<string, T>
}
