import { useRef, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { Dropdown } from '../ui/Dropdown'

export function AccountOptions() {
  const { isAdmin, logout } = useAuth()
  const pending = useRef(false)
  const [signingOut, setSigningOut] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const signOut = async () => {
    if (pending.current) return
    pending.current = true
    setSigningOut(true)
    setError(null)
    try {
      await logout()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to sign out. Try again.')
    } finally {
      pending.current = false
      setSigningOut(false)
    }
  }
  return (
    <div className="min-w-0 max-w-full" aria-busy={signingOut}>
      <Dropdown
        value=""
        onChange={(value) => {
          if (value === 'signout') void signOut()
        }}
        placeholder="Account options"
        aria-label="Account options"
        variant="navigation"
        align="right"
        menuClassName="w-[min(13rem,calc(100vw-2rem))] max-w-full [&_[role=menuitem]_span]:whitespace-normal"
        disabled={signingOut}
        options={[
          ...(isAdmin ? [{ value: 'admin', label: 'Admin console', href: '/admin' }] : []),
          { value: 'signout', label: 'Sign out' },
        ]}
      />
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
