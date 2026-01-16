import React, { useState } from 'react'
import './styles.css'

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-lg border border-stone-200 bg-white shadow-sm dark:border-stone-700 dark:bg-stone-800 ${className}`}>
      {children}
    </div>
  )
}

function CardHeader({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col space-y-1.5 p-6">{children}</div>
}

function CardTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-xl font-semibold tracking-tight text-stone-900 dark:text-stone-50">{children}</h3>
}

function CardDescription({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-stone-600 dark:text-stone-400">{children}</p>
}

function CardContent({ children }: { children: React.ReactNode }) {
  return <div className="p-6 pt-0">{children}</div>
}

function CardFooter({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center p-6 pt-0 gap-2">{children}</div>
}

function Button({
  children,
  variant = 'default',
  onClick
}: {
  children: React.ReactNode
  variant?: 'default' | 'outline'
  onClick?: () => void
}) {
  const styles = variant === 'default'
    ? 'bg-stone-900 text-stone-50 hover:bg-stone-800 dark:bg-stone-200 dark:text-stone-900'
    : 'border border-stone-300 bg-transparent hover:bg-stone-100 dark:border-stone-600 dark:hover:bg-stone-800'

  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center justify-center rounded-md h-10 px-4 py-2 text-sm font-medium transition-colors ${styles}`}
    >
      {children}
    </button>
  )
}

export default function App() {
  const [saved, setSaved] = useState(false)
  const [notifications, setNotifications] = useState(true)

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-900 p-8 font-sans">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Basic Card */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Card</CardTitle>
            <CardDescription>A simple card with header and content.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-stone-700 dark:text-stone-300">
              Cards are containers for grouping related content and actions.
              They can include headers, bodies, and footers.
            </p>
          </CardContent>
        </Card>

        {/* Card with Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Account Settings</CardTitle>
            <CardDescription>Manage your account preferences.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-stone-900 dark:text-stone-50">Email Notifications</p>
                  <p className="text-sm text-stone-600 dark:text-stone-400">Receive email updates</p>
                </div>
                <button
                  onClick={() => setNotifications(!notifications)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    notifications ? 'bg-stone-900 dark:bg-stone-200' : 'bg-stone-300 dark:bg-stone-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white dark:bg-stone-900 transition-transform ${
                      notifications ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 2000) }}>
              {saved ? 'Saved!' : 'Save Changes'}
            </Button>
            <Button variant="outline">Cancel</Button>
          </CardFooter>
        </Card>

        {/* Compact Card */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-stone-200 dark:bg-stone-700 flex items-center justify-center">
                <span className="text-lg font-semibold text-stone-600 dark:text-stone-300">JD</span>
              </div>
              <div>
                <p className="font-medium text-stone-900 dark:text-stone-50">Jane Doe</p>
                <p className="text-sm text-stone-600 dark:text-stone-400">jane@example.com</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
