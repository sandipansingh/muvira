import React, { useEffect, useState } from 'react'
import { LockKeyhole } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { useToast } from '../context/ToastContext'
import { PASSWORD_RECOVERY_SESSION_KEY } from '../lib/authRedirect'
import { supabase } from '../lib/supabase'

export const ResetPasswordPage: React.FC = () => {
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [checking, setChecking] = useState(true)
  const [validRecovery, setValidRecovery] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { showToast } = useToast()
  const navigate = useNavigate()

  useEffect(() => {
    let active = true
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active || event !== 'PASSWORD_RECOVERY' || !session) return
      sessionStorage.setItem(PASSWORD_RECOVERY_SESSION_KEY, session.access_token)
      setValidRecovery(true)
      setError(null)
      setChecking(false)
    })

    void supabase.auth
      .getSession()
      .then(({ data, error: sessionError }) => {
        if (!active) return
        const markedRecoveryToken = sessionStorage.getItem(PASSWORD_RECOVERY_SESSION_KEY)
        if (sessionError) {
          setError(sessionError.message)
          return
        }
        if (data.session && markedRecoveryToken === data.session.access_token) {
          setValidRecovery(true)
          return
        }
        sessionStorage.removeItem(PASSWORD_RECOVERY_SESSION_KEY)
        setError('This password recovery link is invalid or has expired.')
      })
      .catch(() => {
        if (active) setError('The password recovery session could not be verified.')
      })
      .finally(() => {
        if (active) setChecking(false)
      })

    return () => {
      active = false
      listener.subscription.unsubscribe()
    }
  }, [])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    if (!validRecovery) {
      setError('This password recovery session is no longer valid.')
      return
    }
    if (password.length < 8) {
      setError('Password must contain at least 8 characters.')
      return
    }
    if (password !== confirmation) {
      setError('Passwords do not match.')
      return
    }

    setSubmitting(true)
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) throw updateError

      sessionStorage.removeItem(PASSWORD_RECOVERY_SESSION_KEY)
      window.history.replaceState({}, document.title, '/reset-password')
      await supabase.auth.signOut()
      showToast('Password updated. Sign in with your new password.', 'success')
      navigate('/signin', { replace: true })
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Password could not be updated.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface px-4 py-10">
      <div className="w-full max-w-md rounded-3xl border border-line bg-paper p-6 shadow-card sm:p-8">
        <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-primary-soft text-primary">
          <LockKeyhole className="h-6 w-6" />
        </div>
        <h1 className="font-display text-2xl font-bold leading-tight text-ink">
          Set a new password
        </h1>

        {checking ? (
          <p className="mt-4 text-sm text-ink">Validating your recovery link…</p>
        ) : !validRecovery ? (
          <div className="mt-5 space-y-5">
            <p className="text-sm text-danger">{error}</p>
            <Link to="/signin" className="button-primary w-full justify-center">
              Return to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            {error && (
              <p className="rounded-lg border border-danger/30 bg-danger-soft p-3 text-sm text-danger">
                {error}
              </p>
            )}
            <div>
              <label htmlFor="new-password" className="mb-1.5 block text-sm text-ink">
                New password
              </label>
              <Input
                id="new-password"
                type="password"
                minLength={8}
                required
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>
            <div>
              <label htmlFor="confirm-password" className="mb-1.5 block text-sm text-ink">
                Confirm password
              </label>
              <Input
                id="confirm-password"
                type="password"
                minLength={8}
                required
                autoComplete="new-password"
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
              />
            </div>
            <Button type="submit" size="lg" isLoading={submitting} className="w-full">
              Update password
            </Button>
          </form>
        )}
      </div>
    </main>
  )
}

export default ResetPasswordPage
