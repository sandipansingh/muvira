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
    <main className="editorial-page flex items-center justify-center bg-ivory px-4 py-16">
      <div className="w-full max-w-md border border-line bg-paper p-8 sm:p-10">
        <div className="space-y-2 border-b border-line pb-6 text-center">
          <Link to="/" className="text-3xl font-bold tracking-[-0.06em] text-ink">
            Muvira
          </Link>
          <h1 className="editorial-heading text-3xl">Create an account</h1>
          <p className="text-sm text-muted-ink">
            Manage your orders, addresses, and studio purchases.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5 pt-6">
          <div>
            <label htmlFor="signup-name" className="mb-2 block text-xs font-semibold text-ink">
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
            <label htmlFor="signup-phone" className="mb-2 block text-xs font-semibold text-ink">
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
            <label htmlFor="signup-email" className="mb-2 block text-xs font-semibold text-ink">
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
            <label htmlFor="signup-password" className="mb-2 block text-xs font-semibold text-ink">
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
          <button type="submit" disabled={loading} className="editorial-button w-full">
            {loading ? 'Creating...' : 'Create account'}
          </button>
        </form>
        <p className="mt-6 border-t border-line pt-5 text-center text-xs text-muted-ink">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-cognac hover:text-ink">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  )
}
