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
      <div className="w-full max-w-md border-y border-line py-8 sm:py-10">
        <div className="space-y-2 border-b border-line pb-6 text-center">
          <Link to="/" className="text-3xl font-bold tracking-[-0.06em] text-ink">
            Muvira
          </Link>
          <h1 className="editorial-heading text-3xl">Welcome back</h1>
          <p className="text-sm text-muted-ink">
            Sign in to track orders and manage saved addresses.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5 pt-6">
          <div>
            <label htmlFor="login-email" className="mb-2 block text-xs font-semibold text-ink">
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
            <label htmlFor="login-password" className="mb-2 block text-xs font-semibold text-ink">
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
          <button type="submit" disabled={loading} className="editorial-button w-full">
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
        <p className="mt-6 border-t border-line pt-5 text-center text-xs text-muted-ink">
          Do not have an account?{' '}
          <Link
            to="/signup"
            className="font-semibold text-terracotta transition-colors duration-control hover:text-ink"
          >
            Create account
          </Link>
        </p>
      </div>
    </main>
  )
}
