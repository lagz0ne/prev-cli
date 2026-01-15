import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Smartphone, Tablet, Monitor, SunMedium, Moon, Maximize2, Minimize2, GripVertical, SlidersHorizontal, X, Loader2 } from 'lucide-react'
import type { PreviewConfig, PreviewMessage, BuildResult } from '../preview-runtime/types'

interface PreviewProps {
  src: string
  height?: string | number
  title?: string
  mode?: 'wasm' | 'legacy' // 'wasm' uses browser bundling, 'legacy' uses Vite
}

type DeviceMode = 'mobile' | 'tablet' | 'desktop'

const DEVICE_WIDTHS: Record<DeviceMode, number | '100%'> = {
  mobile: 375,
  tablet: 768,
  desktop: '100%',
}

interface Position {
  x: number
  y: number
}

export function Preview({ src, height = 400, title, mode = 'wasm' }: PreviewProps) {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [deviceMode, setDeviceMode] = useState<DeviceMode>('desktop')
  const [customWidth, setCustomWidth] = useState<number | null>(null)
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [showSlider, setShowSlider] = useState(false)
  const [pillPosition, setPillPosition] = useState<Position>({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState<Position>({ x: 0, y: 0 })

  // WASM preview state
  const [buildStatus, setBuildStatus] = useState<'loading' | 'building' | 'ready' | 'error'>('loading')
  const [buildTime, setBuildTime] = useState<number | null>(null)
  const [buildError, setBuildError] = useState<string | null>(null)

  const iframeRef = useRef<HTMLIFrameElement>(null)
  const pillRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // URL depends on mode
  const previewUrl = mode === 'wasm' ? '/_preview-runtime' : `/_preview/${src}`
  const displayTitle = title || src

  // Calculate current width
  const currentWidth = customWidth ?? (DEVICE_WIDTHS[deviceMode] === '100%' ? null : DEVICE_WIDTHS[deviceMode] as number)

  // Handle escape key and body scroll lock
  useEffect(() => {
    if (!isFullscreen) return

    document.body.style.overflow = 'hidden'

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsFullscreen(false)
      }
    }
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = ''
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isFullscreen])

  // Toggle dark mode on iframe
  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe) return

    const applyDarkMode = () => {
      try {
        const doc = iframe.contentDocument
        if (doc?.documentElement) {
          if (isDarkMode) {
            doc.documentElement.classList.add('dark')
          } else {
            doc.documentElement.classList.remove('dark')
          }
        }
      } catch {
        // Cross-origin iframe, can't access
      }
    }

    // Apply on load and when mode changes
    iframe.addEventListener('load', applyDarkMode)
    applyDarkMode()

    return () => {
      iframe.removeEventListener('load', applyDarkMode)
    }
  }, [isDarkMode])

  // WASM preview: Initialize and send config to iframe
  useEffect(() => {
    if (mode !== 'wasm') return

    const iframe = iframeRef.current
    if (!iframe) return

    let configSent = false

    // Handle messages from iframe
    const handleMessage = (event: MessageEvent) => {
      const msg = event.data as PreviewMessage

      if (msg.type === 'ready' && !configSent) {
        // Iframe is ready, fetch and send config
        configSent = true
        setBuildStatus('building')

        fetch(`/_preview-config/${src}`)
          .then(res => res.json())
          .then((config: PreviewConfig) => {
            iframe.contentWindow?.postMessage({ type: 'init', config } as PreviewMessage, '*')
          })
          .catch(err => {
            setBuildStatus('error')
            setBuildError(`Failed to load preview config: ${err.message}`)
          })
      }

      if (msg.type === 'built') {
        const result = msg.result as BuildResult
        if (result.success) {
          setBuildStatus('ready')
          setBuildTime(result.buildTime || null)
          setBuildError(null)
        } else {
          setBuildStatus('error')
          setBuildError(result.error || 'Build failed')
        }
      }

      if (msg.type === 'error') {
        setBuildStatus('error')
        setBuildError(msg.error)
      }
    }

    window.addEventListener('message', handleMessage)

    return () => {
      window.removeEventListener('message', handleMessage)
    }
  }, [mode, src])

  // Drag handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!pillRef.current) return
    e.preventDefault()

    const rect = pillRef.current.getBoundingClientRect()
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    })
    setIsDragging(true)
  }, [])

  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      const container = isFullscreen ? document.body : containerRef.current
      if (!container) return

      const containerRect = isFullscreen
        ? { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight }
        : container.getBoundingClientRect()

      const pillWidth = pillRef.current?.offsetWidth || 0
      const pillHeight = pillRef.current?.offsetHeight || 0

      // Calculate position relative to container
      let newX = e.clientX - containerRect.left - dragOffset.x
      let newY = e.clientY - containerRect.top - dragOffset.y

      // Constrain to container bounds
      newX = Math.max(0, Math.min(newX, containerRect.width - pillWidth))
      newY = Math.max(0, Math.min(newY, containerRect.height - pillHeight))

      setPillPosition({ x: newX, y: newY })
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, dragOffset, isFullscreen])

  // Reset pill position when entering/exiting fullscreen
  useEffect(() => {
    setPillPosition({ x: 0, y: 0 })
  }, [isFullscreen])

  const handleDeviceChange = (mode: DeviceMode) => {
    setDeviceMode(mode)
    setCustomWidth(null)
    setShowSlider(false)
  }

  const handleSliderChange = (value: number) => {
    setCustomWidth(value)
    setDeviceMode('desktop') // Clear device mode when using custom
  }

  // Icon button component
  const IconButton = ({
    onClick,
    active,
    title: btnTitle,
    children
  }: {
    onClick: () => void
    active?: boolean
    title: string
    children: React.ReactNode
  }) => (
    <button
      onClick={onClick}
      className={`p-1.5 rounded transition-colors ${
        active
          ? 'bg-blue-500 text-white'
          : 'text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700 hover:text-zinc-700 dark:hover:text-zinc-300'
      }`}
      title={btnTitle}
      aria-label={btnTitle}
    >
      {children}
    </button>
  )

  // Floating DevTools Pill
  const DevToolsPill = () => {
    const pillStyle: React.CSSProperties = pillPosition.x === 0 && pillPosition.y === 0
      ? { bottom: 12, right: 12 }
      : { left: pillPosition.x, top: pillPosition.y }

    return (
      <div
        ref={pillRef}
        className={`absolute z-50 flex items-center gap-0.5 px-1.5 py-1 bg-white dark:bg-zinc-800 rounded-lg shadow-lg border border-zinc-200 dark:border-zinc-700 ${
          isDragging ? 'cursor-grabbing' : ''
        }`}
        style={pillStyle}
      >
        {/* Drag handle */}
        <div
          onMouseDown={handleMouseDown}
          className="p-1 cursor-grab text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
          title="Drag to move"
        >
          <GripVertical className="w-3 h-3" />
        </div>

        <div className="w-px h-4 bg-zinc-200 dark:bg-zinc-700 mx-0.5" />

        {/* Device modes */}
        <IconButton
          onClick={() => handleDeviceChange('mobile')}
          active={deviceMode === 'mobile' && customWidth === null}
          title="Mobile (375px)"
        >
          <Smartphone className="w-3.5 h-3.5" />
        </IconButton>

        <IconButton
          onClick={() => handleDeviceChange('tablet')}
          active={deviceMode === 'tablet' && customWidth === null}
          title="Tablet (768px)"
        >
          <Tablet className="w-3.5 h-3.5" />
        </IconButton>

        <IconButton
          onClick={() => handleDeviceChange('desktop')}
          active={deviceMode === 'desktop' && customWidth === null}
          title="Desktop (100%)"
        >
          <Monitor className="w-3.5 h-3.5" />
        </IconButton>

        <div className="w-px h-4 bg-zinc-200 dark:bg-zinc-700 mx-0.5" />

        {/* Width slider toggle */}
        <div className="relative">
          <IconButton
            onClick={() => setShowSlider(!showSlider)}
            active={showSlider || customWidth !== null}
            title="Custom width"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
          </IconButton>

          {/* Slider popup */}
          {showSlider && (
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-3 bg-white dark:bg-zinc-800 rounded-lg shadow-lg border border-zinc-200 dark:border-zinc-700 min-w-48">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-zinc-500">Width: {customWidth ?? currentWidth ?? '100%'}px</span>
                <button
                  onClick={() => setShowSlider(false)}
                  className="p-0.5 text-zinc-400 hover:text-zinc-600"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
              <input
                type="range"
                min={320}
                max={1920}
                value={customWidth ?? (typeof currentWidth === 'number' ? currentWidth : 1920)}
                onChange={(e) => handleSliderChange(parseInt(e.target.value))}
                className="w-full accent-blue-500"
              />
              <div className="flex justify-between text-xs text-zinc-400 mt-1">
                <span>320px</span>
                <span>1920px</span>
              </div>
            </div>
          )}
        </div>

        <div className="w-px h-4 bg-zinc-200 dark:bg-zinc-700 mx-0.5" />

        {/* Dark mode toggle */}
        <IconButton
          onClick={() => setIsDarkMode(!isDarkMode)}
          active={isDarkMode}
          title={isDarkMode ? 'Light mode' : 'Dark mode'}
        >
          {isDarkMode ? <Moon className="w-3.5 h-3.5" /> : <SunMedium className="w-3.5 h-3.5" />}
        </IconButton>

        {/* Fullscreen toggle */}
        <IconButton
          onClick={() => setIsFullscreen(!isFullscreen)}
          active={isFullscreen}
          title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
        >
          {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
        </IconButton>
      </div>
    )
  }

  // Calculate iframe style
  const getIframeContainerStyle = (): React.CSSProperties => {
    if (currentWidth === null) {
      return { width: '100%' }
    }
    return {
      width: currentWidth,
      maxWidth: '100%',
      margin: '0 auto',
    }
  }

  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-40 bg-zinc-100 dark:bg-zinc-900 flex items-start justify-center overflow-auto">
        {/* Checkered background pattern */}
        <div
          className="absolute inset-0 opacity-50"
          style={{
            backgroundImage: 'linear-gradient(45deg, #e5e5e5 25%, transparent 25%), linear-gradient(-45deg, #e5e5e5 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e5e5e5 75%), linear-gradient(-45deg, transparent 75%, #e5e5e5 75%)',
            backgroundSize: '20px 20px',
            backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
          }}
        />

        {/* Iframe container */}
        <div
          className="relative bg-white dark:bg-zinc-900 shadow-2xl transition-all duration-300 h-full"
          style={getIframeContainerStyle()}
        >
          <iframe
            ref={iframeRef}
            src={previewUrl}
            className="w-full h-full"
            title={displayTitle}
          />
        </div>

        <DevToolsPill />
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="my-4 border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-hidden relative"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
            {displayTitle}
          </span>
          {mode === 'wasm' && buildStatus === 'building' && (
            <Loader2 className="w-3.5 h-3.5 text-blue-500 animate-spin" />
          )}
          {mode === 'wasm' && buildStatus === 'error' && (
            <span className="text-xs text-red-500">Error</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {mode === 'wasm' && buildTime && (
            <span className="text-xs text-zinc-400">{buildTime}ms</span>
          )}
          <span className="text-xs text-zinc-400">
            {currentWidth ? `${currentWidth}px` : '100%'}
          </span>
        </div>
      </div>

      {/* Build error display */}
      {mode === 'wasm' && buildError && (
        <div className="px-3 py-2 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800">
          <pre className="text-xs text-red-600 dark:text-red-400 whitespace-pre-wrap font-mono overflow-auto max-h-32">
            {buildError}
          </pre>
        </div>
      )}

      {/* Preview area with checkered background */}
      <div
        className="relative bg-zinc-100 dark:bg-zinc-900"
        style={{
          backgroundImage: 'linear-gradient(45deg, #e5e5e5 25%, transparent 25%), linear-gradient(-45deg, #e5e5e5 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e5e5e5 75%), linear-gradient(-45deg, transparent 75%, #e5e5e5 75%)',
          backgroundSize: '16px 16px',
          backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
        }}
      >
        {/* Iframe container */}
        <div
          className="bg-white dark:bg-zinc-900 transition-all duration-300"
          style={getIframeContainerStyle()}
        >
          <iframe
            ref={iframeRef}
            src={previewUrl}
            style={{ height: typeof height === 'number' ? `${height}px` : height }}
            className="w-full"
            title={displayTitle}
          />
        </div>

        <DevToolsPill />
      </div>
    </div>
  )
}
