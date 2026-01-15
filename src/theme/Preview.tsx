import React, { useState } from 'react'
import { Maximize2, Minimize2, ExternalLink } from 'lucide-react'

interface PreviewProps {
  src: string
  height?: string | number
  title?: string
}

export function Preview({ src, height = 400, title }: PreviewProps) {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const previewUrl = `/_preview/${src}`
  const displayTitle = title || src

  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-white dark:bg-zinc-900">
        <div className="flex items-center justify-between p-2 border-b border-zinc-200 dark:border-zinc-700">
          <span className="text-sm font-medium">{displayTitle}</span>
          <div className="flex gap-2">
            <a
              href={previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded"
              title="Open in new tab"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
            <button
              onClick={() => setIsFullscreen(false)}
              className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded"
              title="Exit fullscreen"
            >
              <Minimize2 className="w-4 h-4" />
            </button>
          </div>
        </div>
        <iframe
          src={previewUrl}
          className="w-full h-[calc(100vh-49px)]"
          title={displayTitle}
        />
      </div>
    )
  }

  return (
    <div className="my-4 border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700">
        <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
          {displayTitle}
        </span>
        <div className="flex gap-1">
          <a
            href={previewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded"
            title="Open in new tab"
          >
            <ExternalLink className="w-4 h-4 text-zinc-500" />
          </a>
          <button
            onClick={() => setIsFullscreen(true)}
            className="p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded"
            title="Fullscreen"
          >
            <Maximize2 className="w-4 h-4 text-zinc-500" />
          </button>
        </div>
      </div>
      <iframe
        src={previewUrl}
        style={{ height: typeof height === 'number' ? `${height}px` : height }}
        className="w-full"
        title={displayTitle}
      />
    </div>
  )
}
