import React, { useEffect, useState } from 'react'
import { Mail, ArrowRight } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { authRedirectUrl } from '../../lib/authRedirect'
import { useToast } from '../../context/ToastContext'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Modal } from '../common/Modal'

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
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    if (isOpen) {
      setEmail(initialEmail)
      setSubmitted(false)
      setError(null)
    }
  }, [isOpen, initialEmail])

  if (!isOpen) return null

  const handleResetPassword = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!email.trim()) {
      showToast('Please enter your email address.', 'error')
      return
    }

    setError(null)
    setLoading(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: authRedirectUrl('/reset-password'),
      })

      if (error) {
        setError(error.message || 'Failed to send password reset email.')
        return
      }

      setSubmitted(true)
      showToast('Password reset link sent to your email!', 'success')
    } catch {
      setError('The reset link could not be sent. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setSubmitted(false)
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={submitted ? 'Check your email' : 'Reset Password'}
      maxWidth="md"
    >
      {submitted ? (
        <div className="text-center py-4 space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft text-accent">
            <Mail className="h-6 w-6" />
          </div>

          <p className="text-sm text-ink-soft">
            We&apos;ve sent a password reset link to{' '}
            <span className="font-normal text-ink">{email}</span>.
          </p>
          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={handleClose}
            className="mt-4 w-full"
          >
            Back to Sign In
          </Button>
        </div>
      ) : (
        <form onSubmit={handleResetPassword} className="space-y-5">
          {error && (
            <p role="alert" className="rounded-control bg-danger-soft p-3 text-sm text-danger">
              {error}
            </p>
          )}
          <div className="space-y-2">
            <p className="text-sm text-muted">
              Enter your email address and we&apos;ll send you instructions to reset your password.
            </p>
          </div>

          <div>
            <label htmlFor="reset-email" className="mb-1.5 block text-sm font-normal text-ink-soft">
              Email address
            </label>
            <Input
              id="reset-email"
              data-dialog-initial-focus
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="your.email@example.com"
              autoComplete="email"
            />
          </div>

          <div className="pt-2 flex flex-col gap-2">
            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={loading}
              rightIcon={<ArrowRight className="h-4 w-4 shrink-0" />}
              className="w-full"
            >
              Send Reset Link
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="w-full text-muted hover:text-ink-soft"
            >
              Cancel
            </Button>
          </div>
        </form>
      )}
    </Modal>
  )
}

export default ForgotPasswordModal
