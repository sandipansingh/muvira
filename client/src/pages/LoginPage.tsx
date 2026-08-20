import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true)
    const success = await login(email, password)
    setLoading(false)
    if (success) navigate('/profile')
  }

  return (
    <main className="editorial-page flex items-center justify-center px-4 py-16">
      <div className="kit-panel w-full max-w-md p-8 sm:p-10">
        <div className="space-y-2 border-b border-[var(--kit-line)] pb-6 text-center">
          <Link
            to="/"
            className="inline-flex items-center gap-2 font-display text-2xl font-bold tracking-wider uppercase text-foreground justify-center leading-none"
          >
            <img src="/logo.png" alt="Muvira" className="h-7 w-auto object-contain shrink-0" />
            <span>Muvira</span>
          </Link>
          <h1 className="kit-heading text-3xl">Welcome back</h1>
          <p className="kit-body-copy text-sm">
            Sign in to track orders and manage saved delivery addresses.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 pt-6">
          <div>
            <label
              htmlFor="login-email"
              className="mb-1.5 block text-xs font-bold text-[var(--kit-ink)]"
            >
              Email address
            </label>
            <input
              id="login-email"
              name="email"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@domain.com"
              className="editorial-input"
            />
          </div>
          <div>
            <label
              htmlFor="login-password"
              className="mb-1.5 block text-xs font-bold text-foreground"
            >
              Password
            </label>
            <input
              id="login-password"
              name="password"
              type="password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Your password"
              className="editorial-input"
            />
          </div>
          <button type="submit" disabled={loading} className="kit-button mt-2 w-full py-3 text-sm">
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
        <p className="mt-6 border-t border-[var(--kit-line)] pt-5 text-center text-xs text-[var(--kit-muted)]">
          Don&apos;t have an account?{' '}
          <Link to="/signup" className="font-bold text-brand hover:underline transition-colors">
            Create account
          </Link>
        </p>
      </div>
    </main>
  )
}

export default LoginPage
