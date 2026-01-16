import React, { useState } from 'react'
import './styles.css'

type Variant = 'default' | 'secondary' | 'outline' | 'ghost' | 'destructive'
type Size = 'sm' | 'default' | 'lg'

const variantStyles: Record<Variant, string> = {
  default: 'bg-stone-900 text-stone-50 hover:bg-stone-800 dark:bg-stone-200 dark:text-stone-900 dark:hover:bg-stone-300',
  secondary: 'bg-stone-100 text-stone-900 hover:bg-stone-200 dark:bg-stone-700 dark:text-stone-50 dark:hover:bg-stone-600',
  outline: 'border border-stone-300 bg-transparent hover:bg-stone-100 dark:border-stone-600 dark:hover:bg-stone-800',
  ghost: 'hover:bg-stone-100 dark:hover:bg-stone-800',
  destructive: 'bg-red-600 text-white hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600',
}

const sizeStyles: Record<Size, string> = {
  sm: 'h-9 px-3 text-sm',
  default: 'h-10 px-4 py-2',
  lg: 'h-11 px-8 text-lg',
}

function Button({
  variant = 'default',
  size = 'default',
  disabled = false,
  children,
  onClick,
}: {
  variant?: Variant
  size?: Size
  disabled?: boolean
  children: React.ReactNode
  onClick?: () => void
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        inline-flex items-center justify-center rounded-md font-medium
        transition-colors focus-visible:outline-none focus-visible:ring-2
        focus-visible:ring-stone-500 focus-visible:ring-offset-2
        disabled:pointer-events-none disabled:opacity-50
        ${variantStyles[variant]}
        ${sizeStyles[size]}
      `}
    >
      {children}
    </button>
  )
}

export default function App() {
  const [clickCount, setClickCount] = useState(0)
  const [loading, setLoading] = useState(false)

  const handleLoadingClick = () => {
    setLoading(true)
    setTimeout(() => setLoading(false), 2000)
  }

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-900 p-8 font-sans">
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Variants */}
        <section>
          <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-50 mb-4">
            Variants
          </h2>
          <div className="flex flex-wrap gap-3">
            <Button variant="default">Default</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="destructive">Destructive</Button>
          </div>
        </section>

        {/* Sizes */}
        <section>
          <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-50 mb-4">
            Sizes
          </h2>
          <div className="flex flex-wrap items-center gap-3">
            <Button size="sm">Small</Button>
            <Button size="default">Default</Button>
            <Button size="lg">Large</Button>
          </div>
        </section>

        {/* States */}
        <section>
          <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-50 mb-4">
            States
          </h2>
          <div className="flex flex-wrap items-center gap-3">
            <Button disabled>Disabled</Button>
            <Button onClick={handleLoadingClick} disabled={loading}>
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Loading...
                </>
              ) : (
                'Click to Load'
              )}
            </Button>
          </div>
        </section>

        {/* Interactive */}
        <section>
          <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-50 mb-4">
            Interactive
          </h2>
          <div className="flex items-center gap-4">
            <Button onClick={() => setClickCount(c => c + 1)}>
              Click me
            </Button>
            <span className="text-stone-600 dark:text-stone-400">
              Clicked {clickCount} times
            </span>
          </div>
        </section>
      </div>
    </div>
  )
}
