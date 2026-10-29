import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { Button } from '../ui/Button'
import { Link } from 'react-router-dom'

export function AccountUtilities() {
  const { isAdmin, logout } = useAuth()
  const pending = useRef(false)
  const button = useRef<HTMLButtonElement>(null)
  const mounted = useRef(true)
  const [signingOut, setSigningOut] = useState(false)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])
  useEffect(() => {
    if (error && !signingOut) button.current?.focus()
  }, [error, signingOut])
  const signOut = async () => {
    if (pending.current) return
    pending.current = true
    setSigningOut(true)
    setError(null)
    try {
      await logout()
    } catch (reason) {
      if (mounted.current)
        setError(reason instanceof Error ? reason.message : 'Unable to sign out. Try again.')
    } finally {
      pending.current = false
      if (mounted.current) setSigningOut(false)
    }
  }
  return (
    <div className="min-w-0 max-w-full" aria-busy={signingOut}>
      <div className="account-utilities">
        {isAdmin && (
          <Link to="/admin" className="account-text-link">
            Admin console
          </Link>
        )}
        <Button ref={button} variant="ghost" isLoading={signingOut} onClick={() => void signOut()}>
          Sign out
        </Button>
      </div>
      <span role="status" className="sr-only">
        {signingOut ? 'Signing out…' : ''}
      </span>
      {error && (
        <p role="alert" className="mt-2 max-w-sm text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  )
}
