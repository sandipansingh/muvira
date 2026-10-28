import React, { useEffect, useRef, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import type { AuthMode } from '../../lib/types/auth'
import { authRedirectUrl } from '../../lib/authRedirect'
import { supabase } from '../../lib/supabase'
import { Modal } from '../common/Modal'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'

interface AuthDialogProps {
  mode: AuthMode
  onClose: () => void
  onAuthenticated: () => void
  restoreFocus: () => HTMLElement | null
}

export function AuthDialog({ mode, onClose, onAuthenticated, restoreFocus }: AuthDialogProps) {
  const [view, setView] = useState<AuthMode | 'recovery' | 'confirmation'>(mode)
  const [confirmation, setConfirmation] = useState<'signup' | 'recovery'>('signup')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [credentialsAccepted, setCredentialsAccepted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const attempt = useRef(0)
  const formRef = useRef<HTMLDivElement>(null)
  const { login, signup, user, loading, profileError, retryProfile, logout } = useAuth()

  useEffect(
    () => () => {
      attempt.current += 1
    },
    []
  )
  useEffect(() => {
    if (credentialsAccepted && user && !loading) onAuthenticated()
  }, [credentialsAccepted, user, loading, onAuthenticated])

  const switchView = (next: typeof view) => {
    attempt.current += 1
    setPassword('')
    setShowPassword(false)
    setError(null)
    setSubmitting(false)
    setCredentialsAccepted(false)
    setView(next)
  }

  useEffect(() => {
    formRef.current
      ?.querySelector<HTMLElement>('[data-auth-heading]')
      ?.focus({ preventScroll: true })
  }, [view])

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    const current = ++attempt.current
    setError(null)
    setSubmitting(true)
    try {
      if (view === 'recovery') {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: authRedirectUrl('/reset-password'),
        })
        if (attempt.current !== current) return
        if (resetError) throw new Error(resetError.message)
        setConfirmation('recovery')
        setView('confirmation')
      } else {
        const result =
          view === 'signup'
            ? await signup(email.trim(), password, name.trim(), '')
            : await login(email.trim(), password)
        if (attempt.current !== current) return
        if (!result)
          throw new Error(
            view === 'signup'
              ? 'Your account could not be created. Please try again.'
              : 'We could not sign you in. Check your email and password and try again.'
          )
        setPassword('')
        if (result === 'confirmation') {
          setConfirmation('signup')
          setView('confirmation')
        } else setCredentialsAccepted(true)
      }
    } catch (reason) {
      if (attempt.current === current)
        setError(reason instanceof Error ? reason.message : 'Please try again.')
    } finally {
      if (attempt.current === current) setSubmitting(false)
    }
  }

  const recoverProfile = async (action: 'retry' | 'logout') => {
    const current = ++attempt.current
    setError(null)
    setSubmitting(true)
    try {
      if (action === 'retry') {
        const success = await retryProfile()
        if (attempt.current === current && success) setCredentialsAccepted(true)
      } else {
        await logout()
        if (attempt.current === current) switchView('signin')
      }
    } catch {
      if (attempt.current === current)
        setError('Your account could not be updated. Please try again.')
    } finally {
      if (attempt.current === current) setSubmitting(false)
    }
  }

  const title =
    view === 'confirmation'
      ? 'Check your email'
      : view === 'recovery'
        ? 'Reset password'
        : view === 'signup'
          ? 'Create an account'
          : 'Welcome back.'
  const profileUnavailable = profileError && view !== 'recovery' && view !== 'confirmation'
  const profilePending = credentialsAccepted && !user && loading

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={title}
      maxWidth="sm"
      restoreFocus={restoreFocus}
      presentation="auth"
      headerBrand={
        <div className="inline-flex items-center justify-center gap-2" aria-label="Muvira">
          <img
            src="/logo.png"
            alt=""
            width={659}
            height={723}
            className="brand-mark w-auto object-contain"
          />
          <span className="brand-wordmark font-display text-xl text-ink">Muvira</span>
        </div>
      }
    >
      <div ref={formRef} data-auth-dialog className="space-y-4">
        {error && (
          <p role="alert" className="rounded-control bg-danger-soft p-3 text-sm text-danger">
            {error}
          </p>
        )}
        {profileUnavailable ? (
          <section className="space-y-4">
            <h3 data-auth-heading tabIndex={-1} className="font-display text-xl text-ink">
              Account profile unavailable
            </h3>
            <p role="alert" className="text-sm text-ink">
              {profileError}
            </p>
            <Button
              className="w-full"
              isLoading={submitting || loading}
              onClick={() => void recoverProfile('retry')}
            >
              Retry loading account
            </Button>
            <Button
              variant="secondary"
              className="w-full"
              disabled={submitting || loading}
              onClick={() => void recoverProfile('logout')}
            >
              Sign out
            </Button>
          </section>
        ) : profilePending ? (
          <p role="status" className="text-base text-ink">
            Loading your account…
          </p>
        ) : view === 'confirmation' ? (
          <div className="space-y-4">
            <p data-auth-heading tabIndex={-1} className="text-base text-ink break-words">
              {confirmation === 'signup'
                ? 'Confirm your email address using the link sent to '
                : 'Use the password reset link sent to '}
              <span className="email-value" title={email}>
                {email}
              </span>
              {confirmation === 'signup' && 'Then sign in to continue.'}
            </p>
            <Button className="w-full" onClick={() => switchView('signin')}>
              Back to sign in
            </Button>
          </div>
        ) : (
          <>
            <p data-auth-heading tabIndex={-1} className="text-sm text-ink">
              {view === 'signup'
                ? 'Keep your details, addresses and orders together.'
                : view === 'recovery'
                  ? 'We’ll email you a link to reset your password.'
                  : 'Sign in to continue where you left off.'}
            </p>
            <form onSubmit={submit} className="space-y-3">
              {view === 'signup' && (
                <div>
                  <label htmlFor="auth-name" className="mb-1 block text-sm text-ink">
                    Full name
                  </label>
                  <Input
                    id="auth-name"
                    name="fullName"
                    autoComplete="name"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
              )}
              <div>
                <label htmlFor="auth-email" className="mb-1 block text-sm text-ink">
                  Email address
                </label>
                <Input
                  id="auth-email"
                  name="email"
                  data-dialog-initial-focus
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              {view !== 'recovery' && (
                <div>
                  <label htmlFor="auth-password" className="mb-1 block text-sm text-ink">
                    Password
                  </label>
                  <div className="relative">
                    <Input
                      id="auth-password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete={view === 'signup' ? 'new-password' : 'current-password'}
                      required
                      minLength={view === 'signup' ? 6 : undefined}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pr-12"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 grid w-11 cursor-pointer place-items-center text-muted hover:text-ink focus-visible:outline focus-visible:outline-primary"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>
              )}
              {view === 'signin' && (
                <Button variant="ghost" onClick={() => switchView('recovery')}>
                  Forgot password?
                </Button>
              )}
              <Button type="submit" className="w-full" isLoading={submitting}>
                {view === 'signup'
                  ? 'Create account'
                  : view === 'recovery'
                    ? 'Send reset link'
                    : 'Sign in'}
              </Button>
            </form>
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => switchView(view === 'signin' ? 'signup' : 'signin')}
            >
              {view === 'signin' ? 'Sign up' : 'Back to sign in'}
            </Button>
          </>
        )}
      </div>
    </Modal>
  )
}
