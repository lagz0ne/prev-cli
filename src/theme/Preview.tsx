import React, { useState, useEffect, useRef } from 'react'
import { IconDeviceMobile, IconDeviceTablet, IconDeviceDesktop, IconArrowsMaximize, IconArrowsMinimize, IconAdjustmentsHorizontal, IconX, IconLoader2, IconArrowLeft } from '@tabler/icons-react'
import { Link } from '@tanstack/react-router'
import type { PreviewConfig, PreviewMessage, BuildResult } from '../preview-runtime/types'

interface PreviewProps {
  src: string
  height?: string | number
  title?: string
  mode?: 'wasm' | 'legacy'
  showHeader?: boolean // Show full header with back button and devtools
}

type DeviceMode = 'mobile' | 'tablet' | 'desktop'

const DEVICE_WIDTHS: Record<DeviceMode, number | '100%'> = {
  mobile: 375,
  tablet: 768,
  desktop: '100%',
}

export function Preview({ src, height = 400, title, mode = 'wasm', showHeader = false }: PreviewProps) {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [deviceMode, setDeviceMode] = useState<DeviceMode>('desktop')
  const [customWidth, setCustomWidth] = useState<number | null>(null)
  const [showSlider, setShowSlider] = useState(false)

  // WASM preview state
  const [buildStatus, setBuildStatus] = useState<'loading' | 'building' | 'ready' | 'error'>('loading')
  const [buildTime, setBuildTime] = useState<number | null>(null)
  const [buildError, setBuildError] = useState<string | null>(null)

  const iframeRef = useRef<HTMLIFrameElement>(null)

  // URL depends on mode
  const previewUrl = mode === 'wasm' ? '/_preview-runtime' : `/_preview/${src}`
  const displayTitle = title || src

  // Calculate current width
  const currentWidth = customWidth ?? (DEVICE_WIDTHS[deviceMode] === '100%' ? null : DEVICE_WIDTHS[deviceMode] as number)

  // Use master dark mode from document
  const isDarkMode = typeof document !== 'undefined' && document.documentElement.classList.contains('dark')

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

  // Apply dark mode to iframe content
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
        // Cross-origin iframe
      }
    }

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

    const handleMessage = (event: MessageEvent) => {
      const msg = event.data as PreviewMessage

      if (msg.type === 'ready' && !configSent) {
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

  const handleDeviceChange = (mode: DeviceMode) => {
    setDeviceMode(mode)
    setCustomWidth(null)
    setShowSlider(false)
  }

  const handleSliderChange = (value: number) => {
    setCustomWidth(value)
    setDeviceMode('desktop')
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
      style={{
        padding: '6px',
        borderRadius: '4px',
        border: 'none',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'background-color 0.15s, color 0.15s',
        backgroundColor: active ? 'var(--fd-primary, #3b82f6)' : 'transparent',
        color: active ? '#fff' : 'var(--fd-muted-foreground, #71717a)',
      }}
      title={btnTitle}
      aria-label={btnTitle}
    >
      {children}
    </button>
  )

  // DevTools in header - device modes, width slider, fullscreen
  const DevTools = () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
      <IconButton
        onClick={() => handleDeviceChange('mobile')}
        active={deviceMode === 'mobile' && customWidth === null}
        title="Mobile (375px)"
      >
        <IconDeviceMobile size={16} />
      </IconButton>

      <IconButton
        onClick={() => handleDeviceChange('tablet')}
        active={deviceMode === 'tablet' && customWidth === null}
        title="Tablet (768px)"
      >
        <IconDeviceTablet size={16} />
      </IconButton>

      <IconButton
        onClick={() => handleDeviceChange('desktop')}
        active={deviceMode === 'desktop' && customWidth === null}
        title="Desktop (100%)"
      >
        <IconDeviceDesktop size={16} />
      </IconButton>

      <div style={{ width: '1px', height: '16px', backgroundColor: 'var(--fd-border, #e4e4e7)', margin: '0 4px' }} />

      {/* Width slider toggle */}
      <div style={{ position: 'relative' }}>
        <IconButton
          onClick={() => setShowSlider(!showSlider)}
          active={showSlider || customWidth !== null}
          title="Custom width"
        >
          <IconAdjustmentsHorizontal size={16} />
        </IconButton>

        {showSlider && (
          <div style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: '8px',
            padding: '12px',
            backgroundColor: 'var(--fd-background, #fff)',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            border: '1px solid var(--fd-border, #e4e4e7)',
            minWidth: '192px',
            zIndex: 100,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '12px', color: 'var(--fd-muted-foreground, #71717a)' }}>
                Width: {customWidth ?? currentWidth ?? '100%'}px
              </span>
              <button
                onClick={() => setShowSlider(false)}
                style={{ padding: '2px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fd-muted-foreground, #a1a1aa)' }}
              >
                <IconX size={12} />
              </button>
            </div>
            <input
              type="range"
              min={320}
              max={1920}
              value={customWidth ?? (typeof currentWidth === 'number' ? currentWidth : 1920)}
              onChange={(e) => handleSliderChange(parseInt(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--fd-primary, #3b82f6)' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--fd-muted-foreground, #a1a1aa)', marginTop: '4px' }}>
              <span>320px</span>
              <span>1920px</span>
            </div>
          </div>
        )}
      </div>

      <IconButton
        onClick={() => setIsFullscreen(!isFullscreen)}
        active={isFullscreen}
        title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
      >
        {isFullscreen ? <IconArrowsMinimize size={16} /> : <IconArrowsMaximize size={16} />}
      </IconButton>
    </div>
  )

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
        zIndex: 9999,
        backgroundColor: 'var(--fd-muted, #f4f4f5)',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Fullscreen header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          backgroundColor: 'var(--fd-background, #fff)',
          borderBottom: '1px solid var(--fd-border, #e4e4e7)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '16px', fontWeight: 600, color: 'var(--fd-foreground)' }}>
              {displayTitle}
            </span>
            {mode === 'wasm' && buildTime && (
              <span style={{ fontSize: '12px', color: 'var(--fd-muted-foreground, #a1a1aa)' }}>{buildTime}ms</span>
            )}
          </div>
          <DevTools />
        </div>

        {/* Checkered background */}
        <div style={{
          flex: 1,
          position: 'relative',
          backgroundImage: 'linear-gradient(45deg, var(--fd-border, #e5e5e5) 25%, transparent 25%), linear-gradient(-45deg, var(--fd-border, #e5e5e5) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, var(--fd-border, #e5e5e5) 75%), linear-gradient(-45deg, transparent 75%, var(--fd-border, #e5e5e5) 75%)',
          backgroundSize: '20px 20px',
          backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
          display: 'flex',
          justifyContent: 'center',
        }}>
          <div style={{
            backgroundColor: 'var(--fd-background, #fff)',
            boxShadow: '0 4px 24px rgba(0,0,0,0.1)',
            height: '100%',
            ...getIframeContainerStyle(),
          }}>
            <iframe
              ref={iframeRef}
              src={previewUrl}
              style={{ width: '100%', height: '100%', border: 'none' }}
              title={displayTitle}
            />
          </div>
        </div>
      </div>
    )
  }

  // Non-fullscreen with showHeader (individual preview page)
  if (showHeader) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Header with back button and devtools */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          backgroundColor: 'var(--fd-card, #fafafa)',
          borderBottom: '1px solid var(--fd-border, #e4e4e7)',
          borderRadius: '8px 8px 0 0',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Link
              to="/previews"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                color: 'var(--fd-muted-foreground, #71717a)',
                textDecoration: 'none',
                fontSize: '14px',
              }}
            >
              <IconArrowLeft size={16} />
              Back
            </Link>
            <div style={{ width: '1px', height: '20px', backgroundColor: 'var(--fd-border, #e4e4e7)' }} />
            <span style={{ fontSize: '16px', fontWeight: 600, color: 'var(--fd-foreground)' }}>
              {displayTitle}
            </span>
            {mode === 'wasm' && buildStatus === 'building' && (
              <IconLoader2 size={16} style={{ color: 'var(--fd-primary, #3b82f6)', animation: 'spin 1s linear infinite' }} />
            )}
            {mode === 'wasm' && buildTime && (
              <span style={{ fontSize: '12px', color: 'var(--fd-muted-foreground, #a1a1aa)' }}>{buildTime}ms</span>
            )}
          </div>
          <DevTools />
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
        <div style={{
          flex: 1,
          position: 'relative',
          backgroundColor: 'var(--fd-muted, #f4f4f5)',
          backgroundImage: 'linear-gradient(45deg, var(--fd-border, #e5e5e5) 25%, transparent 25%), linear-gradient(-45deg, var(--fd-border, #e5e5e5) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, var(--fd-border, #e5e5e5) 75%), linear-gradient(-45deg, transparent 75%, var(--fd-border, #e5e5e5) 75%)',
          backgroundSize: '16px 16px',
          backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
          display: 'flex',
          justifyContent: 'center',
        }}>
          <div style={{
            backgroundColor: 'var(--fd-background, #fff)',
            transition: 'all 0.3s',
            ...getIframeContainerStyle(),
          }}>
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
        </div>
      </div>
    )
  }

  // Embedded preview (no header, compact)
  return (
    <div style={{
      margin: '16px 0',
      border: '1px solid var(--fd-border, #e4e4e7)',
      borderRadius: '8px',
      overflow: 'hidden',
      position: 'relative',
    }}>
      {/* Compact header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 12px',
        backgroundColor: 'var(--fd-card, #fafafa)',
        borderBottom: '1px solid var(--fd-border, #e4e4e7)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--fd-foreground, #52525b)' }}>
            {displayTitle}
          </span>
          {mode === 'wasm' && buildStatus === 'building' && (
            <IconLoader2 size={14} style={{ color: 'var(--fd-primary, #3b82f6)', animation: 'spin 1s linear infinite' }} />
          )}
          {mode === 'wasm' && buildStatus === 'error' && (
            <span style={{ fontSize: '12px', color: '#ef4444' }}>Error</span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {mode === 'wasm' && buildTime && (
            <span style={{ fontSize: '12px', color: 'var(--fd-muted-foreground, #a1a1aa)' }}>{buildTime}ms</span>
          )}
          <span style={{ fontSize: '12px', color: 'var(--fd-muted-foreground, #a1a1aa)' }}>
            {currentWidth ? `${currentWidth}px` : '100%'}
          </span>
          <DevTools />
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

      {/* Preview area */}
      <div style={{
        position: 'relative',
        backgroundColor: 'var(--fd-muted, #f4f4f5)',
        backgroundImage: 'linear-gradient(45deg, var(--fd-border, #e5e5e5) 25%, transparent 25%), linear-gradient(-45deg, var(--fd-border, #e5e5e5) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, var(--fd-border, #e5e5e5) 75%), linear-gradient(-45deg, transparent 75%, var(--fd-border, #e5e5e5) 75%)',
        backgroundSize: '16px 16px',
        backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
        display: 'flex',
        justifyContent: 'center',
      }}>
        <div style={{
          backgroundColor: 'var(--fd-background, #fff)',
          transition: 'all 0.3s',
          ...getIframeContainerStyle(),
        }}>
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
      </div>
    </div>
  )
}
