import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { AuthHeroCard } from '../components/auth/AuthHeroCard'

export const SignUpPage: React.FC = () => {
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [agreeTerms, setAgreeTerms] = useState(true)
  const [loading, setLoading] = useState(false)

  const { signup } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!agreeTerms) {
      showToast('Please accept the Terms of Use and Privacy Policy to continue.', 'error')
      return
    }

    setLoading(true)
    const success = await signup(email.trim(), password, fullName.trim(), phone.trim())
    setLoading(false)
    if (success) {
      navigate('/signin')
    }
  }

  return (
    <main className="flex min-h-screen md:h-screen w-full items-center justify-center bg-white p-4 sm:p-6 lg:p-10 overflow-y-auto md:overflow-hidden">
      <div className="grid grid-cols-1 md:grid-cols-2 items-stretch gap-8 lg:gap-16 w-full max-w-6xl md:h-[92vh] md:max-h-[780px]">
        {/* Left Column: Visual Hero Card */}
        <div className="h-[240px] sm:h-[300px] md:h-full w-full">
          <AuthHeroCard className="h-full min-h-full" />
        </div>

        {/* Right Column: Sign Up Form */}
        <div className="flex flex-col justify-center px-2 py-4 sm:px-6 md:px-8">
          <div className="mx-auto w-full max-w-[400px]">
            {/* Header Title and Switcher */}
            <div className="space-y-1.5 sm:space-y-2">
              <h1 className="font-display text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl">
                Sign Up
              </h1>
              <p className="text-sm text-neutral-500">
                Already have an account?{' '}
                <Link
                  to="/signin"
                  className="font-medium text-[#38CB89] hover:underline transition-colors"
                >
                  Sign In
                </Link>
              </p>
            </div>

            {/* Form Controls */}
            <form onSubmit={handleSubmit} className="mt-6 sm:mt-7 space-y-4 sm:space-y-5">
              {/* Full Name */}
              <div className="relative border-b border-neutral-300">
                <input
                  id="signup-name"
                  name="fullName"
                  type="text"
                  required
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  placeholder="Your full name"
                  className="w-full bg-transparent py-2.5 sm:py-3 text-base text-neutral-900 placeholder:text-neutral-400 outline-none focus:outline-none focus:ring-0 border-none"
                  autoComplete="name"
                />
              </div>

              {/* Phone Number */}
              <div className="relative border-b border-neutral-300">
                <input
                  id="signup-phone"
                  name="phone"
                  type="tel"
                  required
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="Phone number"
                  className="w-full bg-transparent py-2.5 sm:py-3 text-base text-neutral-900 placeholder:text-neutral-400 outline-none focus:outline-none focus:ring-0 border-none"
                  autoComplete="tel"
                />
              </div>

              {/* Username/Email Input */}
              <div className="relative border-b border-neutral-300">
                <input
                  id="signup-email"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="Your username or email address"
                  className="w-full bg-transparent py-2.5 sm:py-3 text-base text-neutral-900 placeholder:text-neutral-400 outline-none focus:outline-none focus:ring-0 border-none"
                  autoComplete="email"
                />
              </div>

              {/* Password Input with Show/Hide Toggle */}
              <div className="relative flex items-center border-b border-neutral-300">
                <input
                  id="signup-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Password (at least 6 characters)"
                  className="w-full bg-transparent py-2.5 sm:py-3 pr-10 text-base text-neutral-900 placeholder:text-neutral-400 outline-none focus:outline-none focus:ring-0 border-none"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-0 p-1 text-neutral-400 hover:text-neutral-700 transition-colors cursor-pointer outline-none focus:outline-none"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 stroke-[1.75]" />
                  ) : (
                    <Eye className="h-5 w-5 stroke-[1.75]" />
                  )}
                </button>
              </div>

              {/* Terms Agreement Checkbox */}
              <div className="pt-1 text-sm">
                <label className="flex items-start gap-2.5 cursor-pointer select-none text-neutral-600">
                  <input
                    type="checkbox"
                    checked={agreeTerms}
                    onChange={(event) => setAgreeTerms(event.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-neutral-300 text-[#2D6A7E] focus:ring-[#2D6A7E]"
                  />
                  <span className="text-xs sm:text-sm text-neutral-500">
                    I agree with{' '}
                    <span className="font-medium text-neutral-900">Privacy Policy</span> and{' '}
                    <span className="font-medium text-neutral-900">Terms of Use</span>
                  </span>
                </label>
              </div>

              {/* Submit Action Button */}
              <div className="pt-2 sm:pt-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex w-full items-center justify-center rounded-lg bg-[#2D6A7E] py-3.5 text-sm sm:text-base font-semibold text-white shadow-xs transition-colors hover:bg-[#235868] active:bg-[#1c4856] disabled:opacity-60 cursor-pointer"
                >
                  {loading ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Creating account...</span>
                    </span>
                  ) : (
                    <span>Sign Up</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </main>
  )
}

export default SignUpPage
