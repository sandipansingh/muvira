import React, { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { AuthHeroCard } from '../components/auth/AuthHeroCard'
import { ForgotPasswordModal } from '../components/auth/ForgotPasswordModal'

export const SignInPage: React.FC = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const { login } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const returnTo = searchParams.get('returnTo') || '/profile'

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true)
    const success = await login(email.trim(), password)
    setLoading(false)
    if (success) {
      navigate(returnTo)
    }
  }

  return (
    <main className="flex min-h-[calc(100vh-140px)] items-center justify-center px-4 py-8 sm:px-6 sm:py-12 md:py-16">
      <div className="w-full max-w-5xl rounded-3xl bg-white p-3 sm:p-4 md:p-6 lg:p-8 shadow-xs border border-neutral-100">
        <div className="grid grid-cols-1 items-stretch gap-8 md:grid-cols-2 lg:gap-12">
          {/* Left Column: Visual Hero Card */}
          <div className="h-[280px] sm:h-[340px] md:h-full md:min-h-[540px]">
            <AuthHeroCard className="h-full min-h-full" />
          </div>

          {/* Right Column: Sign In Form */}
          <div className="flex flex-col justify-center px-2 py-4 sm:px-6 sm:py-8 md:px-8">
            <div className="mx-auto w-full max-w-[400px]">
              {/* Header Title and Switcher */}
              <div className="space-y-2">
                <h1 className="font-display text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl">
                  Sign In
                </h1>
                <p className="text-sm text-neutral-500">
                  Don&apos;t have an account yet?{' '}
                  <Link
                    to="/signup"
                    className="font-medium text-[#38CB89] hover:underline transition-colors"
                  >
                    Sign Up
                  </Link>
                </p>
              </div>

              {/* Form Controls */}
              <form onSubmit={handleSubmit} className="mt-8 space-y-6">
                {/* Username/Email Input */}
                <div className="relative border-b border-neutral-300 focus-within:border-neutral-900 transition-colors">
                  <input
                    id="signin-email"
                    name="email"
                    type="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="Your username or email address"
                    className="w-full bg-transparent py-3 text-base text-neutral-900 placeholder:text-neutral-400 focus:outline-hidden"
                    autoComplete="email"
                  />
                </div>

                {/* Password Input with Show/Hide Toggle */}
                <div className="relative flex items-center border-b border-neutral-300 focus-within:border-neutral-900 transition-colors">
                  <input
                    id="signin-password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Password"
                    className="w-full bg-transparent py-3 pr-10 text-base text-neutral-900 placeholder:text-neutral-400 focus:outline-hidden"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-0 p-1 text-neutral-400 hover:text-neutral-700 transition-colors cursor-pointer"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 stroke-[1.75]" />
                    ) : (
                      <Eye className="h-5 w-5 stroke-[1.75]" />
                    )}
                  </button>
                </div>

                {/* Remember Me and Forgot Password */}
                <div className="flex items-center justify-between gap-2 pt-1 text-sm">
                  <label className="flex items-center gap-2 cursor-pointer select-none text-neutral-600">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(event) => setRememberMe(event.target.checked)}
                      className="h-4 w-4 rounded border-neutral-300 text-[#2D6A7E] focus:ring-[#2D6A7E]"
                    />
                    <span className="text-xs sm:text-sm">Remember me</span>
                  </label>

                  <button
                    type="button"
                    onClick={() => setIsForgotPasswordOpen(true)}
                    className="text-xs sm:text-sm font-semibold text-neutral-900 hover:text-black hover:underline cursor-pointer transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>

                {/* Submit Action Button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex w-full items-center justify-center rounded-lg bg-[#2D6A7E] py-3.5 text-sm sm:text-base font-semibold text-white shadow-xs transition-colors hover:bg-[#235868] active:bg-[#1c4856] disabled:opacity-60 cursor-pointer"
                  >
                    {loading ? (
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Signing in...</span>
                      </span>
                    ) : (
                      <span>Sign In</span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Forgot Password Dialog */}
      <ForgotPasswordModal
        isOpen={isForgotPasswordOpen}
        onClose={() => setIsForgotPasswordOpen(false)}
        initialEmail={email}
      />
    </main>
  )
}

export default SignInPage
