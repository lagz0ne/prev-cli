declare module 'virtual:prev-pages' {
  export interface Page {
    route: string
    title: string
    file: string
    description?: string
    frontmatter?: Record<string, unknown>
  }

  export interface SidebarItem {
    title: string
    route?: string
    children?: SidebarItem[]
  }

  export const pages: Page[]
  export const sidebar: SidebarItem[]
}

declare module 'virtual:prev-previews' {
  export interface Preview {
    name: string
    route: string
    htmlPath: string
  }

  export const previews: Preview[]
}

declare module 'virtual:prev-config' {
  import type { PrevConfig } from '../config'
  export const config: PrevConfig
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
