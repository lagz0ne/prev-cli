import React from 'react'

type FrontmatterValue = string | number | boolean | string[] | unknown

interface MetadataBlockProps {
  frontmatter: Record<string, FrontmatterValue>
  title?: string
  description?: string
}

// Fields to skip (shown elsewhere or internal)
const SKIP_FIELDS = new Set(['title', 'description'])

// Fields with special icons
const FIELD_ICONS: Record<string, string> = {
  date: '📅',
  author: '👤',
  tags: '🏷️',
  status: '📌',
  version: '📦',
  repo: '🔗',
  url: '🔗',
  link: '🔗',
}

/**
 * Detect the display type of a value
 */
function detectType(key: string, value: FrontmatterValue): 'date' | 'url' | 'boolean' | 'array' | 'number' | 'string' {
  if (Array.isArray(value)) return 'array'
  if (typeof value === 'boolean') return 'boolean'
  if (typeof value === 'number') return 'number'
  if (typeof value !== 'string') return 'string'

  // Check for URL
  if (value.startsWith('http://') || value.startsWith('https://')) return 'url'

  // Check for date patterns
  if (key === 'date' || key.includes('date') || key.includes('Date')) {
    // ISO date or YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}/.test(value)) return 'date'
  }

  return 'string'
}

/**
 * Format a date string nicely
 */
function formatDate(value: string): string {
  try {
    const date = new Date(value)
    if (isNaN(date.getTime())) return value
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  } catch {
    return value
  }
}

/**
 * Render a single metadata value based on its type
 */
function renderValue(key: string, value: FrontmatterValue): React.ReactNode {
  const type = detectType(key, value)

  switch (type) {
    case 'array':
      return (
        <span className="metadata-array">
          {(value as string[]).map((item, i) => (
            <span key={i} className="metadata-chip">{item}</span>
          ))}
        </span>
      )

    case 'boolean':
      return (
        <span className={`metadata-boolean ${value ? 'is-true' : 'is-false'}`}>
          {value ? '✓' : '✗'}
        </span>
      )

    case 'url':
      return (
        <a href={value as string} className="metadata-link" target="_blank" rel="noopener noreferrer">
          {(value as string).replace(/^https?:\/\//, '').split('/')[0]}
        </a>
      )

    case 'date':
      return <span className="metadata-date">{formatDate(value as string)}</span>

    case 'number':
      return <span className="metadata-number">{(value as number).toLocaleString()}</span>

    default:
      return <span className="metadata-string">{String(value)}</span>
  }
}

export function MetadataBlock({ frontmatter, title, description }: MetadataBlockProps) {
  // Filter out skipped fields and empty values
  const fields = Object.entries(frontmatter).filter(
    ([key, value]) => !SKIP_FIELDS.has(key) && value !== undefined && value !== null && value !== ''
  )

  // Check for draft status
  const isDraft = frontmatter.draft === true

  // Only show title/description if they came from frontmatter (not extracted from H1)
  const hasExplicitTitle = 'title' in frontmatter && frontmatter.title
  const hasExplicitDescription = 'description' in frontmatter && frontmatter.description

  // If no explicit metadata and no other fields, don't render the block
  if (fields.length === 0 && !hasExplicitTitle && !hasExplicitDescription && !isDraft) {
    return null
  }

  return (
    <div className="metadata-block">
      {hasExplicitTitle && <h1 className="metadata-title">{title}</h1>}
      {hasExplicitDescription && <p className="metadata-description">{description}</p>}

      {(fields.length > 0 || isDraft) && (
        <div className="metadata-fields">
          {isDraft && (
            <span className="metadata-field metadata-draft">
              <span className="metadata-chip is-draft">Draft</span>
            </span>
          )}
          {fields.filter(([key]) => key !== 'draft').map(([key, value]) => (
            <span key={key} className="metadata-field">
              {FIELD_ICONS[key] && <span className="metadata-icon">{FIELD_ICONS[key]}</span>}
              <span className="metadata-key">{key}:</span>
              {renderValue(key, value)}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
