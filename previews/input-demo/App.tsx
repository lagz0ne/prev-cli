import React, { useState } from 'react'
import './styles.css'

function Label({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
  return (
    <label
      htmlFor={htmlFor}
      className="text-sm font-medium text-stone-900 dark:text-stone-50"
    >
      {children}
    </label>
  )
}

function Input({
  id,
  type = 'text',
  placeholder,
  value,
  onChange,
  disabled = false,
  error = false,
  maxLength,
}: {
  id?: string
  type?: string
  placeholder?: string
  value?: string
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
  disabled?: boolean
  error?: boolean
  maxLength?: number
}) {
  return (
    <input
      id={id}
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      disabled={disabled}
      maxLength={maxLength}
      className={`
        flex h-10 w-full rounded-md border bg-white px-3 py-2 text-sm
        placeholder:text-stone-500 dark:placeholder:text-stone-400
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
        disabled:cursor-not-allowed disabled:opacity-50
        dark:bg-stone-800 dark:text-stone-50
        ${error
          ? 'border-red-500 focus-visible:ring-red-500'
          : 'border-stone-300 dark:border-stone-600 focus-visible:ring-stone-500'
        }
      `}
    />
  )
}

function HelperText({ children, error = false }: { children: React.ReactNode; error?: boolean }) {
  return (
    <p className={`text-sm mt-1 ${error ? 'text-red-500' : 'text-stone-600 dark:text-stone-400'}`}>
      {children}
    </p>
  )
}

export default function App() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [bio, setBio] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const emailError = email.length > 0 && !email.includes('@')
  const passwordError = password.length > 0 && password.length < 8
  const bioMaxLength = 100

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-900 p-8 font-sans">
      <div className="max-w-md mx-auto space-y-6">
        {/* Basic Input */}
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={emailError}
          />
          {emailError && (
            <HelperText error>Please enter a valid email address</HelperText>
          )}
        </div>

        {/* Password with Toggle */}
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={passwordError}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-700 dark:hover:text-stone-300"
            >
              {showPassword ? (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
              ) : (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          </div>
          {passwordError ? (
            <HelperText error>Password must be at least 8 characters</HelperText>
          ) : (
            <HelperText>Use a strong, unique password</HelperText>
          )}
        </div>

        {/* With Character Count */}
        <div className="space-y-2">
          <Label htmlFor="bio">Bio</Label>
          <Input
            id="bio"
            placeholder="Tell us about yourself"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={bioMaxLength}
          />
          <div className="flex justify-between">
            <HelperText>Brief description for your profile</HelperText>
            <span className={`text-sm ${bio.length >= bioMaxLength ? 'text-red-500' : 'text-stone-500'}`}>
              {bio.length}/{bioMaxLength}
            </span>
          </div>
        </div>

        {/* Disabled State */}
        <div className="space-y-2">
          <Label htmlFor="disabled">Disabled</Label>
          <Input
            id="disabled"
            placeholder="This input is disabled"
            disabled
          />
        </div>
      </div>
    </div>
  )
}
