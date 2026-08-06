import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const success = await login(email, password)
    setLoading(false)
    if (success) {
      navigate('/profile')
    }
  }

  return (
    <main className="bg-[#FDFBF7] min-h-screen py-16 px-4 flex items-center justify-center">
      <div className="max-w-md w-full bg-white p-8 sm:p-10 rounded-3xl border border-zinc-200 shadow-sm space-y-6">
        <div className="text-center space-y-2">
          <span className="font-serif text-3xl font-bold text-zinc-900">Muvira</span>
          <h1 className="font-serif text-2xl font-bold text-zinc-900">Welcome Back</h1>
          <p className="text-xs text-zinc-500">
            Sign in to track orders and manage saved addresses
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@domain.com"
              className="w-full bg-[#F6F4EF] border border-zinc-300 rounded-xl px-4 py-3 text-base text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#C88D35]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-[#F6F4EF] border border-zinc-300 rounded-xl px-4 py-3 text-base text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#C88D35]"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-zinc-900 hover:bg-[#C88D35] text-white font-semibold text-xs uppercase tracking-wider rounded-xl transition-colors shadow-md disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="text-center text-xs text-zinc-500 pt-2 border-t border-zinc-100">
          Don't have an account?{' '}
          <Link to="/signup" className="text-[#C88D35] font-semibold hover:underline">
            Create Account
          </Link>
        </div>
      </div>
    </main>
  )
}
