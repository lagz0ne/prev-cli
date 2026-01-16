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

  // Icon button component - using inline styles since Tailwind isn't enabled for docs
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
      style={{
        padding: '6px',
        borderRadius: '4px',
        border: 'none',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'background-color 0.15s, color 0.15s',
        backgroundColor: active ? '#3b82f6' : 'transparent',
        color: active ? '#fff' : '#71717a',
      }}
      title={btnTitle}
      aria-label={btnTitle}
    >
      {children}
    </button>
  )

  // Floating DevTools Pill - using inline styles since Tailwind isn't enabled for docs
  const DevToolsPill = () => {
    const baseStyle: React.CSSProperties = {
      position: 'absolute',
      zIndex: 50,
      display: 'flex',
      alignItems: 'center',
      gap: '2px',
      padding: '4px 6px',
      backgroundColor: '#fff',
      borderRadius: '8px',
      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)',
      border: '1px solid #e4e4e7',
    }

    const positionStyle: React.CSSProperties = pillPosition.x === 0 && pillPosition.y === 0
      ? { bottom: 12, right: 12 }
      : { left: pillPosition.x, top: pillPosition.y }

    const dividerStyle: React.CSSProperties = {
      width: '1px',
      height: '16px',
      backgroundColor: '#e4e4e7',
      margin: '0 2px',
    }

    return (
      <div
        ref={pillRef}
        style={{ ...baseStyle, ...positionStyle, cursor: isDragging ? 'grabbing' : undefined }}
      >
        {/* Drag handle */}
        <div
          onMouseDown={handleMouseDown}
          style={{ padding: '4px', cursor: 'grab', color: '#a1a1aa' }}
          title="Drag to move"
        >
          <GripVertical style={{ width: 12, height: 12 }} />
        </div>

        <div style={dividerStyle} />

        {/* Device modes */}
        <IconButton
          onClick={() => handleDeviceChange('mobile')}
          active={deviceMode === 'mobile' && customWidth === null}
          title="Mobile (375px)"
        >
          <Smartphone style={{ width: 14, height: 14 }} />
        </IconButton>

        <IconButton
          onClick={() => handleDeviceChange('tablet')}
          active={deviceMode === 'tablet' && customWidth === null}
          title="Tablet (768px)"
        >
          <Tablet style={{ width: 14, height: 14 }} />
        </IconButton>

        <IconButton
          onClick={() => handleDeviceChange('desktop')}
          active={deviceMode === 'desktop' && customWidth === null}
          title="Desktop (100%)"
        >
          <Monitor style={{ width: 14, height: 14 }} />
        </IconButton>

        <div style={dividerStyle} />

        {/* Width slider toggle */}
        <div style={{ position: 'relative' }}>
          <IconButton
            onClick={() => setShowSlider(!showSlider)}
            active={showSlider || customWidth !== null}
            title="Custom width"
          >
            <SlidersHorizontal style={{ width: 14, height: 14 }} />
          </IconButton>

          {/* Slider popup */}
          {showSlider && (
            <div style={{
              position: 'absolute',
              bottom: '100%',
              left: '50%',
              transform: 'translateX(-50%)',
              marginBottom: '8px',
              padding: '12px',
              backgroundColor: '#fff',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
              border: '1px solid #e4e4e7',
              minWidth: '192px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', color: '#71717a' }}>Width: {customWidth ?? currentWidth ?? '100%'}px</span>
                <button
                  onClick={() => setShowSlider(false)}
                  style={{ padding: '2px', background: 'none', border: 'none', cursor: 'pointer', color: '#a1a1aa' }}
                >
                  <X style={{ width: 12, height: 12 }} />
                </button>
              </div>
              <input
                type="range"
                min={320}
                max={1920}
                value={customWidth ?? (typeof currentWidth === 'number' ? currentWidth : 1920)}
                onChange={(e) => handleSliderChange(parseInt(e.target.value))}
                style={{ width: '100%', accentColor: '#3b82f6' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#a1a1aa', marginTop: '4px' }}>
                <span>320px</span>
                <span>1920px</span>
              </div>
            </div>
          )}
        </div>

        <div style={dividerStyle} />

        {/* Dark mode toggle */}
        <IconButton
          onClick={() => setIsDarkMode(!isDarkMode)}
          active={isDarkMode}
          title={isDarkMode ? 'Light mode' : 'Dark mode'}
        >
          {isDarkMode ? <Moon style={{ width: 14, height: 14 }} /> : <SunMedium style={{ width: 14, height: 14 }} />}
        </IconButton>

        {/* Fullscreen toggle */}
        <IconButton
          onClick={() => setIsFullscreen(!isFullscreen)}
          active={isFullscreen}
          title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
        >
          {isFullscreen ? <Minimize2 style={{ width: 14, height: 14 }} /> : <Maximize2 style={{ width: 14, height: 14 }} />}
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
      <div style={{
        position: 'fixed',
        inset: 0,
        zIndex: 40,
        backgroundColor: '#f4f4f5',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        overflow: 'auto',
      }}>
        {/* Checkered background pattern */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            opacity: 0.5,
            backgroundImage: 'linear-gradient(45deg, #e5e5e5 25%, transparent 25%), linear-gradient(-45deg, #e5e5e5 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e5e5e5 75%), linear-gradient(-45deg, transparent 75%, #e5e5e5 75%)',
            backgroundSize: '20px 20px',
            backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
          }}
        />

        {/* Iframe container */}
        <div
          style={{
            position: 'relative',
            backgroundColor: '#fff',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
            transition: 'all 0.3s',
            height: '100%',
            ...getIframeContainerStyle(),
          }}
        >
          <iframe
            ref={iframeRef}
            src={previewUrl}
            style={{ width: '100%', height: '100%', border: 'none' }}
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
      style={{
        margin: '16px 0',
        border: '1px solid #e4e4e7',
        borderRadius: '8px',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 12px',
        backgroundColor: '#fafafa',
        borderBottom: '1px solid #e4e4e7',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '14px', fontWeight: 500, color: '#52525b' }}>
            {displayTitle}
          </span>
          {mode === 'wasm' && buildStatus === 'building' && (
            <Loader2 style={{ width: 14, height: 14, color: '#3b82f6', animation: 'spin 1s linear infinite' }} />
          )}
          {mode === 'wasm' && buildStatus === 'error' && (
            <span style={{ fontSize: '12px', color: '#ef4444' }}>Error</span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {mode === 'wasm' && buildTime && (
            <span style={{ fontSize: '12px', color: '#a1a1aa' }}>{buildTime}ms</span>
          )}
          <span style={{ fontSize: '12px', color: '#a1a1aa' }}>
            {currentWidth ? `${currentWidth}px` : '100%'}
          </span>
        </div>
      </div>

      {/* Build error display */}
      {mode === 'wasm' && buildError && (
        <div style={{
          padding: '8px 12px',
          backgroundColor: '#fef2f2',
          borderBottom: '1px solid #fecaca',
        }}>
          <pre style={{
            fontSize: '12px',
            color: '#dc2626',
            whiteSpace: 'pre-wrap',
            fontFamily: 'monospace',
            overflow: 'auto',
            maxHeight: '128px',
            margin: 0,
          }}>
            {buildError}
          </pre>
        </div>
      )}

      {/* Preview area with checkered background */}
      <div
        style={{
          position: 'relative',
          backgroundColor: '#f4f4f5',
          backgroundImage: 'linear-gradient(45deg, #e5e5e5 25%, transparent 25%), linear-gradient(-45deg, #e5e5e5 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e5e5e5 75%), linear-gradient(-45deg, transparent 75%, #e5e5e5 75%)',
          backgroundSize: '16px 16px',
          backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
        }}
      >
        {/* Iframe container */}
        <div
          style={{
            backgroundColor: '#fff',
            transition: 'all 0.3s',
            ...getIframeContainerStyle(),
          }}
        >
          <iframe
            ref={iframeRef}
            src={previewUrl}
            style={{
              height: typeof height === 'number' ? `${height}px` : height,
              width: '100%',
              border: 'none',
            }}
            title={displayTitle}
          />
        </div>

        <DevToolsPill />
      </div>
    </div>
  )
}
