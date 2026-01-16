import React, { createContext, useContext, useState, useCallback } from 'react'

interface DevToolsContextValue {
  devToolsContent: React.ReactNode | null
  setDevToolsContent: (content: React.ReactNode | null) => void
}

const DevToolsContext = createContext<DevToolsContextValue | null>(null)

export function DevToolsProvider({ children }: { children: React.ReactNode }) {
  const [devToolsContent, setDevToolsContent] = useState<React.ReactNode | null>(null)

  return (
    <DevToolsContext.Provider value={{ devToolsContent, setDevToolsContent }}>
      {children}
    </DevToolsContext.Provider>
  )
}

// Fallback for when context isn't available (e.g., SSR or standalone usage)
const fallbackContext: DevToolsContextValue = {
  devToolsContent: null,
  setDevToolsContent: () => {},
}

export function useDevTools() {
  const context = useContext(DevToolsContext)
  // Return fallback instead of throwing - safer for SSR and edge cases
  return context ?? fallbackContext
}

export function useRegisterDevTools(content: React.ReactNode | null, deps: any[] = []) {
  const { setDevToolsContent } = useDevTools()

  React.useEffect(() => {
    setDevToolsContent(content)
    return () => setDevToolsContent(null)
  }, deps)
}
