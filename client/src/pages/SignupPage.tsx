import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export const SignupPage: React.FC = () => {
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const { signup } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true)
    const success = await signup(email, password, fullName, phone)
    setLoading(false)
    if (success) navigate('/login')
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
          <h1 className="kit-heading text-3xl">Create an Account</h1>
          <p className="kit-body-copy text-sm">
            Manage your orders, delivery addresses, and studio purchases.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 pt-6">
          <div>
            <label
              htmlFor="signup-name"
              className="mb-1.5 block text-xs font-bold text-[var(--kit-ink)]"
            >
              Full name
            </label>
            <input
              id="signup-name"
              name="fullName"
              type="text"
              required
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              placeholder="Your full name"
              className="editorial-input"
            />
          </div>
          <div>
            <label
              htmlFor="signup-phone"
              className="mb-1.5 block text-xs font-bold text-foreground"
            >
              Phone number
            </label>
            <input
              id="signup-phone"
              name="phone"
              type="tel"
              required
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="10-digit mobile number"
              className="editorial-input"
            />
          </div>
          <div>
            <label
              htmlFor="signup-email"
              className="mb-1.5 block text-xs font-bold text-foreground"
            >
              Email address
            </label>
            <input
              id="signup-email"
              name="email"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              className="editorial-input"
            />
          </div>
          <div>
            <label
              htmlFor="signup-password"
              className="mb-1.5 block text-xs font-bold text-foreground"
            >
              Password
            </label>
            <input
              id="signup-password"
              name="password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="At least 6 characters"
              className="editorial-input"
            />
          </div>
          <button type="submit" disabled={loading} className="kit-button mt-2 w-full py-3 text-sm">
            {loading ? 'Creating...' : 'Create account'}
          </button>
        </form>
        <p className="mt-6 border-t border-[var(--kit-line)] pt-5 text-center text-xs text-[var(--kit-muted)]">
          Already have an account?{' '}
          <Link to="/login" className="font-bold text-brand hover:underline transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  )
}

export default SignupPage
