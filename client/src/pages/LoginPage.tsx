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
      <div className="w-full max-w-md rounded-3xl border border-border-light bg-neutral-50/60 p-8 sm:p-10 shadow-premium">
        <div className="space-y-2 border-b border-border-light pb-6 text-center">
          <Link
            to="/"
            className="inline-flex items-center gap-2 font-display text-2xl font-bold tracking-wider uppercase text-foreground group justify-center"
          >
            <img
              src="/logo.png"
              alt="Muvira"
              className="h-7 w-auto object-contain transition-transform group-hover:scale-105"
            />
            <span>Muvira</span>
          </Link>
          <h1 className="font-display text-2xl font-bold text-foreground">Welcome back</h1>
          <p className="text-xs text-neutral-500">
            Sign in to track orders and manage saved delivery addresses.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 pt-6">
          <div>
            <label htmlFor="login-email" className="mb-1.5 block text-xs font-bold text-foreground">
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
          <button
            type="submit"
            disabled={loading}
            className="editorial-button w-full py-3 text-sm font-bold mt-2"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
        <p className="mt-6 border-t border-border-light pt-5 text-center text-xs text-neutral-500">
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
