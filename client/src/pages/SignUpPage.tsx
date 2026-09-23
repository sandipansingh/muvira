import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { AuthHeroCard } from '../components/auth/AuthHeroCard'
import { SocialAuthButtons } from '../components/auth/SocialAuthButtons'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'

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
    const result = await signup(email.trim(), password, fullName.trim(), '')
    setLoading(false)
    if (result === 'authenticated') navigate('/profile')
    if (result === 'confirmation') navigate('/signin')
  }

  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-paper p-4 sm:p-6 lg:p-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 items-center gap-8 lg:gap-12 w-full max-w-5xl my-auto">
        {/* Left Column: Sign Up Form */}
        <div className="flex flex-col items-center justify-center px-2 py-1 sm:px-6 md:px-8 w-full max-w-[390px] mx-auto">
          {/* Brand Logo & Name */}
          <Link
            to="/"
            className="flex min-h-[var(--tap-target)] items-center gap-2.5 mb-3 select-none transition-transform hover:scale-105"
            aria-label="Back to home"
          >
            <img
              src="/logo.png"
              alt="Muvira"
              width={659}
              height={723}
              className="brand-mark w-auto object-contain shrink-0"
            />
            <span className="translate-y-[2px] font-display text-2xl sm:text-3xl tracking-tight text-ink leading-none">
              Muvira
            </span>
          </Link>

          {/* Heading and Subtitle */}
          <div className="text-center space-y-1 w-full">
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-ink">
              Create an Account
            </h1>
            <p className="text-base text-muted font-normal">
              Sign up to get started on your journey.
            </p>
          </div>

          {/* Social Auth (Google) */}
          <div className="w-full mt-4">
            <SocialAuthButtons disabled={loading} />
          </div>

          {/* Clean OR Divider */}
          <div className="relative w-full flex items-center justify-center my-3.5">
            <div className="w-full border-t border-line" />
            <span className="bg-paper px-3 text-xs font-normal text-muted tracking-wider select-none">
              OR
            </span>
            <div className="w-full border-t border-line" />
          </div>

          {/* Sign Up Form */}
          <form onSubmit={handleSubmit} className="w-full flex flex-col gap-3 text-left">
            {/* Full Name */}
            <div>
              <label htmlFor="signup-name" className="block text-sm font-normal text-ink-soft mb-1">
                Full name
              </label>
              <Input
                id="signup-name"
                name="fullName"
                type="text"
                required
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                placeholder="e.g. Sarah Jenkins"
                autoComplete="name"
              />
            </div>

            {/* Email Address */}
            <div>
              <label
                htmlFor="signup-email"
                className="block text-sm font-normal text-ink-soft mb-1"
              >
                Email address
              </label>
              <Input
                id="signup-email"
                name="email"
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Example@gmail.com"
                autoComplete="email"
              />
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="signup-password"
                className="block text-sm font-normal text-ink-soft mb-1"
              >
                Password
              </label>
              <div className="relative flex items-center">
                <Input
                  id="signup-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter your password (min. 6 chars)"
                  className="pr-11"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 p-1 text-muted hover:text-ink-soft transition-colors cursor-pointer outline-none focus:outline-none"
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
              <Button
                type="submit"
                variant="primary"
                size="md"
                isLoading={loading}
                className="w-full"
              >
                Sign up
              </Button>
            </div>
          </form>

          {/* Switch to Sign In */}
          <p className="mt-3.5 text-center text-base text-ink-soft">
            Already have an account?{' '}
            <Link
              to="/signin"
              className="inline-flex min-h-[var(--tap-target)] items-center font-normal text-ink hover:text-primary hover:underline transition-colors"
            >
              Sign in
            </Link>
          </p>

          {/* Terms & Privacy Disclaimer */}
          <p className="mt-4 text-center text-sm text-muted max-w-xs mx-auto leading-relaxed">
            By continuing you agree to our{' '}
            <span className="underline font-normal text-ink-soft cursor-pointer hover:text-primary">
              Terms &amp; Conditions
            </span>{' '}
            and acknowledge our{' '}
            <span className="underline font-normal text-ink-soft cursor-pointer hover:text-primary">
              Privacy Policy
            </span>
            .
          </p>
        </div>

        {/* Right Column: Visual Hero Card with Multi-Slide Carousel */}
        <div className="hidden lg:block h-full w-full min-h-[27.5rem]">
          <AuthHeroCard className="h-full min-h-[440px] max-h-[580px]" />
        </div>
      </div>
    </main>
  )
}

export default SignUpPage
