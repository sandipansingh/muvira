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
      <div className="w-full max-w-md rounded-3xl border border-border-light bg-neutral-50/60 p-8 sm:p-10 shadow-premium">
        <div className="space-y-2 border-b border-border-light pb-6 text-center">
          <Link
            to="/"
            className="font-display text-2xl font-bold tracking-wider uppercase text-foreground"
          >
            Muvira
          </Link>
          <h1 className="font-display text-2xl font-bold text-foreground">Create an Account</h1>
          <p className="text-xs text-neutral-500">
            Manage your orders, delivery addresses, and studio purchases.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 pt-6">
          <div>
            <label htmlFor="signup-name" className="mb-1.5 block text-xs font-bold text-foreground">
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
          <button
            type="submit"
            disabled={loading}
            className="editorial-button w-full py-3 text-sm font-bold mt-2"
          >
            {loading ? 'Creating...' : 'Create account'}
          </button>
        </form>
        <p className="mt-6 border-t border-border-light pt-5 text-center text-xs text-neutral-500">
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
