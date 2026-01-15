import React, { useState } from 'react'
import './styles.css'

export default function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full animate-fade-in">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          WASM Preview Demo
        </h1>
        <p className="text-gray-600 mb-6">
          React + TypeScript + Tailwind, bundled in the browser via esbuild-wasm
        </p>

        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => setCount(c => c - 1)}
            className="w-12 h-12 rounded-full bg-red-500 hover:bg-red-600 text-white text-2xl font-bold transition-colors"
          >
            -
          </button>
          <span className="text-4xl font-mono font-bold text-gray-800 w-20 text-center">
            {count}
          </span>
          <button
            onClick={() => setCount(c => c + 1)}
            className="w-12 h-12 rounded-full bg-green-500 hover:bg-green-600 text-white text-2xl font-bold transition-colors"
          >
            +
          </button>
        </div>

        <div className="text-sm text-gray-500 bg-gray-50 rounded-lg p-3">
          <code>No server-side bundling required!</code>
        </div>
      </div>
    </div>
  )
}
