import type { ReactNode } from 'react'
import { useAuth } from '../../context/AuthContext'
import { AccountNavigation } from './AccountNavigation'
import { AccountUtilities } from './AccountUtilities'

export function AccountShell({
  children,
  addressCount,
}: {
  children: ReactNode
  addressCount?: number
}) {
  const { user } = useAuth()
  const initials = (user?.fullName || user?.email || '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toLocaleUpperCase('en-IN')
  return (
    <main className="account-page editorial-page py-8 sm:py-12">
      <div className="editorial-container account-shell">
        <aside className="account-sidebar" aria-label="Account workspace">
          <div className="account-identity">
            <span className="account-initials" aria-hidden="true">
              {initials}
            </span>
            <div className="min-w-0">
              <p className="font-semibold text-ink">{user?.fullName || 'Your account'}</p>
              <p className="account-email">{user?.email}</p>
            </div>
          </div>
          <AccountNavigation addressCount={addressCount} />
          <AccountUtilities />
        </aside>
        <div className="account-main">{children}</div>
      </div>
    </main>
  )
}
