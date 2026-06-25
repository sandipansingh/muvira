import React, { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import Input from '../../components/ui/Input'
import Button from '../../components/ui/Button'
import Card, { CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card'
import { Lock, Mail } from 'lucide-react'

export const Login: React.FC = () => {
  const { login, loading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  // Get redirection path or fall back to "/"
  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname || '/'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!email || !password) {
      setError('Please fill in all fields.')
      return
    }

    const success = await login(email, password)
    if (success) {
      navigate(from, { replace: true })
    }
  }

  const handleQuickLogin = async (role: 'user' | 'admin') => {
    setError(null)
    const demoEmail = role === 'admin' ? 'admin@muvira.com' : 'user@muvira.com'
    const demoPassword = role === 'admin' ? 'admin123' : 'user123'

    setEmail(demoEmail)
    setPassword(demoPassword)

    const success = await login(demoEmail, demoPassword)
    if (success) {
      navigate(from, { replace: true })
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-6">
      <Card className="w-full max-w-md shadow-lg border border-secondary200">
        <CardHeader className="text-center">
          <CardTitle className="text-xl md:text-2xl font-bold tracking-wide">
            Account Login
          </CardTitle>
          <CardDescription>
            Access your order history, default shipping addresses, and cart.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-100 rounded-lg text-xs font-semibold text-dangerColor text-center">
                {error}
              </div>
            )}

            <div className="relative">
              <Mail className="absolute left-3.5 top-[38px] -translate-y-1/2 w-4 h-4 text-secondary400 z-10" />
              <Input
                type="email"
                label="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="customer@example.com"
                className="pl-10"
                disabled={loading}
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-3.5 top-[38px] -translate-y-1/2 w-4 h-4 text-secondary400 z-10" />
              <Input
                type="password"
                label="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="pl-10"
                disabled={loading}
              />
            </div>

            <div className="text-right">
              <Link
                to="/forgot-password"
                className="text-xs font-semibold text-primaryBg hover:text-primaryHover hover:underline"
              >
                Forgot Password?
              </Link>
            </div>

            <Button type="submit" loading={loading} className="w-full mt-2">
              Sign In
            </Button>
          </form>

          {/* Divider */}
          <div className="relative flex py-5 items-center">
            <div className="flex-grow border-t border-secondary200"></div>
            <span className="flex-shrink mx-4 text-xs font-semibold text-secondary500 uppercase tracking-widest">
              Or Quick Login
            </span>
            <div className="flex-grow border-t border-secondary200"></div>
          </div>

          {/* Quick Demo Logins */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleQuickLogin('user')}
              disabled={loading}
              className="bg-white"
            >
              Demo Customer
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleQuickLogin('admin')}
              disabled={loading}
              className="bg-white border border-secondary300"
            >
              Demo Admin
            </Button>
          </div>

          <p className="text-xs text-center text-secondary600 mt-6 tracking-wide">
            Don't have an account?{' '}
            <Link
              to="/signup"
              className="font-semibold text-primaryBg hover:text-primaryHover hover:underline"
            >
              Create Account
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

export default Login
