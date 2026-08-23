import React, { useState } from 'react'
import { X, Mail, Loader2, ArrowRight } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../context/ToastContext'

interface ForgotPasswordModalProps {
  isOpen: boolean
  onClose: () => void
  initialEmail?: string
}

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({
  isOpen,
  onClose,
  initialEmail = '',
}) => {
  const [email, setEmail] = useState(initialEmail)
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const { showToast } = useToast()

  if (!isOpen) return null

  const handleResetPassword = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!email.trim()) {
      showToast('Please enter your email address.', 'error')
      return
    }

    setLoading(true)
    try {
      const redirectUrl =
        typeof window !== 'undefined' ? `${window.location.origin}/signin` : undefined

      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: redirectUrl,
      })

      if (error) {
        showToast(error.message || 'Failed to send password reset email.', 'error')
        return
      }

      setSubmitted(true)
      showToast('Password reset link sent to your email!', 'success')
    } catch {
      showToast('An unexpected error occurred. Please try again.', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setSubmitted(false)
    onClose()
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
    >
      <div className="relative w-full max-w-md rounded-2xl bg-paper p-6 sm:p-8 shadow-2xl">
        <button
          type="button"
          onClick={handleClose}
          className="absolute right-4 top-4 rounded-full p-2 text-muted hover:bg-surface hover:text-ink-soft transition-colors cursor-pointer"
          aria-label="Close dialog"
        >
          <X className="h-5 w-5" />
        </button>

        {submitted ? (
          <div className="text-center py-4 space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft text-accent">
              <Mail className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-bold text-ink">Check Your Email</h2>
            <p className="text-sm text-ink-soft">
              We&apos;ve sent a password reset link to{' '}
              <span className="font-semibold text-ink">{email}</span>.
            </p>
            <button
              type="button"
              onClick={handleClose}
              className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-ink py-3 text-sm font-medium text-white transition-colors hover:bg-black cursor-pointer"
            >
              Back to Sign In
            </button>
          </div>
        ) : (
          <form onSubmit={handleResetPassword} className="space-y-5">
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-ink">Reset Password</h2>
              <p className="text-sm text-muted">
                Enter your email address and we&apos;ll send you instructions to reset your
                password.
              </p>
            </div>

            <div>
              <label
                htmlFor="reset-email"
                className="mb-1.5 block text-sm font-semibold text-ink-soft"
              >
                Email address
              </label>
              <input
                id="reset-email"
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="your.email@example.com"
                className="w-full px-4 py-3 bg-white border border-field-border rounded-xl text-base text-ink placeholder:text-muted focus:outline-none focus:border-ink focus:ring-1 focus:ring-ink transition-colors"
                autoComplete="email"
              />
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <button
                type="submit"
                disabled={loading}
                className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-ink py-3.5 text-sm font-semibold text-white transition-colors hover:bg-black disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                    <span>Sending link...</span>
                  </>
                ) : (
                  <>
                    <span>Send Reset Link</span>
                    <ArrowRight className="h-4 w-4 shrink-0" />
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="w-full py-2 text-center text-sm font-medium text-muted hover:text-ink-soft transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

export default ForgotPasswordModal
