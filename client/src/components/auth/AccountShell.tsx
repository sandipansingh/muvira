import type { ReactNode } from 'react'
import { useAuth } from '../../context/AuthContext'
import { AccountNavigation } from './AccountNavigation'
import { AccountUtilities } from './AccountUtilities'
import { useLocation } from 'react-router-dom'
import { CustomerPageHeading } from '../common/CustomerPageHeading'

export function AccountShell({
  children,
  addressCount,
}: {
  children: ReactNode
  addressCount?: number
}) {
  const { user } = useAuth()
  const { pathname } = useLocation()
  return (
    <main className="account-page editorial-page py-6 sm:py-8">
      <div className="editorial-container account-container">
        <header className="account-identity">
          {pathname === '/profile' || pathname === '/orders' ? (
            <CustomerPageHeading title="Your account" />
          ) : (
            <p className="page-title mb-2">Your account</p>
          )}
          <div className="account-identity-line">
            <p className="text-sm font-medium text-ink">{user?.fullName}</p>
            <p className="account-email">{user?.email}</p>
          </div>
        </header>
        <div className="account-shell">
          <aside className="account-sidebar" aria-label="Account workspace">
            <AccountNavigation addressCount={addressCount} />
            <AccountUtilities />
          </aside>
          <div className="account-main">{children}</div>
        </div>
      </div>
    </main>
  )
}
