'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const inputClass =
    'w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-base text-gray-900 placeholder-gray-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200'

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) {
      setMessage(error.message)
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-red-900 via-red-700 to-green-800 px-4 py-6">
      <div className="mx-auto max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <h1 className="text-3xl font-bold text-gray-900">SCAN Cards Login</h1>
        <p className="mt-2 text-sm text-gray-600">
          Sign in to access the dashboard.
        </p>

        <form onSubmit={handleLogin} className="mt-6 space-y-4">
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-800">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
              placeholder="you@example.com"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-800">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
              placeholder="Enter your password"
              required
            />
          </div>

          {message && (
            <div className="rounded-xl bg-red-50 p-3 text-sm font-medium text-red-700">
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-blue-600 px-4 py-4 text-base font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Login'}
          </button>
        </form>
      </div>
    </main>
  )
}