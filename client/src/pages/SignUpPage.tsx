import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { AuthHeroCard } from '../components/auth/AuthHeroCard'
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
    <main className="auth-page auth-page--split flex min-h-screen w-full items-center justify-center bg-background p-4 sm:p-6 lg:p-10">
      <div className="grid grid-cols-1 lg:grid-cols-2 items-center gap-8 lg:gap-12 w-full max-w-6xl my-auto">
        {/* Left Column: Sign Up Form */}
        <div className="flex flex-col items-center justify-center px-2 py-1 sm:px-6 md:px-8 w-full max-w-[440px] mx-auto">
          {/* Brand Logo & Name */}
          <Link
            to="/"
            className="flex min-h-[var(--tap-target)] items-center gap-2.5 mb-10 self-start select-none"
            aria-label="Back to home"
          >
            <img
              src="/logo.png"
              alt=""
              width={659}
              height={723}
              className="brand-mark w-auto object-contain shrink-0"
            />
            <span className="translate-y-[2px] font-display text-2xl sm:text-3xl tracking-tight text-ink leading-none">
              Muvira
            </span>
          </Link>

          {/* Heading and Subtitle */}
          <div className="text-left space-y-3 w-full">
            <h1 className="font-display text-3xl sm:text-4xl tracking-tight text-ink">
              Create an Account
            </h1>
            <p className="text-base text-muted font-normal">
              Sign up to get started on your journey.
            </p>
          </div>

          {/* Sign Up Form */}
          <form onSubmit={handleSubmit} className="mt-6 w-full flex flex-col gap-3 text-left">
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
