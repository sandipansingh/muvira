import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { AuthHeroCard } from '../components/auth/AuthHeroCard'
import { SocialAuthButtons } from '../components/auth/SocialAuthButtons'

export const SignUpPage: React.FC = () => {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const { signup } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (password.length < 6) {
      showToast('Password must be at least 6 characters.', 'error')
      return
    }

    setLoading(true)
    const success = await signup(email.trim(), password, fullName.trim(), '')
    setLoading(false)
    if (success) {
      navigate('/signin')
    }
  }

  return (
    <main className="flex min-h-screen lg:h-screen w-full items-center justify-center bg-white p-4 sm:p-6 lg:p-8 overflow-y-auto lg:overflow-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-2 items-center gap-8 lg:gap-12 w-full max-w-5xl my-auto lg:h-[84vh] lg:max-h-[580px]">
        {/* Left Column: Sign Up Form */}
        <div className="flex flex-col items-center justify-center px-2 py-1 sm:px-6 md:px-8 w-full max-w-[390px] mx-auto">
          {/* Brand Logo & Name */}
          <Link
            to="/"
            className="flex items-center gap-2.5 mb-3 select-none transition-transform hover:scale-105"
            aria-label="Back to home"
          >
            <img
              src="/logo.png"
              alt="Muvira"
              className="h-7 sm:h-8 w-auto object-contain shrink-0"
            />
            <span className="translate-y-[2px] font-display text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 leading-none">
              Muvira
            </span>
          </Link>

          {/* Heading and Subtitle */}
          <div className="text-center space-y-1 w-full">
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900">
              Create an Account
            </h1>
            <p className="text-xs sm:text-sm text-neutral-500 font-normal">
              Sign up to get started on your journey.
            </p>
          </div>

          {/* Social Auth (Google) */}
          <div className="w-full mt-4">
            <SocialAuthButtons disabled={loading} />
          </div>

          {/* Clean OR Divider */}
          <div className="relative w-full flex items-center justify-center my-3.5">
            <div className="w-full border-t border-neutral-200" />
            <span className="bg-white px-3 text-xs font-semibold text-neutral-400 tracking-wider select-none">
              OR
            </span>
            <div className="w-full border-t border-neutral-200" />
          </div>

          {/* Sign Up Form */}
          <form onSubmit={handleSubmit} className="w-full flex flex-col gap-3 text-left">
            {/* Full Name */}
            <div>
              <label
                htmlFor="signup-name"
                className="block text-sm font-semibold text-neutral-800 mb-1"
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
                placeholder="e.g. Sarah Jenkins"
                className="w-full px-3.5 py-2.5 bg-white border border-neutral-200 rounded-xl text-base text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 transition-colors"
                autoComplete="name"
              />
            </div>

            {/* Email Address */}
            <div>
              <label
                htmlFor="signup-email"
                className="block text-sm font-semibold text-neutral-800 mb-1"
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
                placeholder="Example@gmail.com"
                className="w-full px-3.5 py-2.5 bg-white border border-neutral-200 rounded-xl text-base text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 transition-colors"
                autoComplete="email"
              />
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="signup-password"
                className="block text-sm font-semibold text-neutral-800 mb-1"
              >
                Password
              </label>
              <div className="relative flex items-center">
                <input
                  id="signup-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter your password (min. 6 chars)"
                  className="w-full px-3.5 py-2.5 pr-11 bg-white border border-neutral-200 rounded-xl text-base text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 transition-colors"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 p-1 text-neutral-400 hover:text-neutral-700 transition-colors cursor-pointer outline-none focus:outline-none"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5 stroke-[1.75]" />
                  ) : (
                    <Eye className="w-5 h-5 stroke-[1.75]" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit Action Button */}
            <div className="pt-1">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl bg-neutral-900 hover:bg-neutral-800 active:bg-black text-white font-medium text-sm sm:text-base shadow-sm transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Creating account...</span>
                  </span>
                ) : (
                  <span>Sign up</span>
                )}
              </button>
            </div>
          </form>

          {/* Switch to Sign In */}
          <p className="mt-3.5 text-center text-xs sm:text-sm text-neutral-600">
            Already have an account?{' '}
            <Link
              to="/signin"
              className="font-semibold text-neutral-900 underline hover:text-black transition-colors"
            >
              Log in
            </Link>
          </p>

          {/* Terms & Privacy Disclaimer */}
          <p className="mt-4 text-center text-[11px] sm:text-xs text-neutral-500 max-w-xs mx-auto leading-relaxed">
            By continuing you agree to our{' '}
            <span className="underline font-medium text-neutral-800 cursor-pointer hover:text-black">
              Terms &amp; Conditions
            </span>{' '}
            and acknowledge our{' '}
            <span className="underline font-medium text-neutral-800 cursor-pointer hover:text-black">
              Privacy Policy
            </span>
            .
          </p>
        </div>

        {/* Right Column: Visual Hero Card with Multi-Slide Carousel */}
        <div className="hidden lg:block h-full w-full max-h-[580px]">
          <AuthHeroCard className="h-full min-h-[440px] max-h-[580px]" />
        </div>
      </div>
    </main>
  )
}

export default SignUpPage
