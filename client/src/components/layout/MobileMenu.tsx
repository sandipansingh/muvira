import React from 'react'
import { ChevronRight, User, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

interface MobileMenuProps {
  isOpen: boolean
  onClose: () => void
}

const collectionLinks = [
  { label: 'Shop', to: '/shop' },
  { label: 'Living room', to: '/shop?category=living-room' },
  { label: 'Bedroom', to: '/shop?category=bedroom' },
  { label: 'Dining', to: '/shop?category=dining' },
  { label: 'Office & decor', to: '/shop?category=office-decor' },
]

export const MobileMenu: React.FC<MobileMenuProps> = ({ isOpen, onClose }) => {
  const { isAuthenticated, user, logout } = useAuth()

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 lg:hidden"
      role="dialog"
      aria-modal="true"
      aria-label="Main menu"
    >
      <button
        type="button"
        className="absolute inset-0 h-full w-full bg-ink/50"
        onClick={onClose}
        aria-label="Close mobile menu"
      />
      <aside className="relative flex h-full w-[min(88vw,24rem)] flex-col justify-between border-r border-rule bg-paper">
        <div>
          <div className="flex items-center justify-between border-b border-rule px-space-6 py-space-4">
            <Link
              to="/"
              onClick={onClose}
              className="font-display text-heading-s-mobile font-bold tracking-tight text-ink"
            >
              Muvira
            </Link>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-pill p-space-3 text-ink transition-colors duration-control hover:bg-surface"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <nav className="px-space-6 py-space-4">
            {collectionLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={onClose}
                className="flex items-center justify-between border-b border-rule py-space-4 text-body font-semibold text-ink transition-colors duration-control hover:text-terracotta"
              >
                {link.label}
                <ChevronRight className="h-4 w-4 text-muted" />
              </Link>
            ))}
          </nav>
        </div>

        <div className="border-t border-rule bg-surface px-space-6 py-space-6">
          {isAuthenticated ? (
            <div className="space-y-space-4">
              <div>
                <p className="text-body font-semibold text-ink">{user?.fullName}</p>
                <p className="text-ui text-muted">{user?.email}</p>
              </div>
              <div className="grid grid-cols-2 gap-space-3">
                <Link
                  to="/orders"
                  onClick={onClose}
                  className="editorial-button-secondary px-space-3 py-space-3"
                >
                  My orders
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    logout()
                    onClose()
                  }}
                  className="border border-danger px-space-3 py-space-3 text-ui font-semibold text-danger transition-colors duration-control hover:bg-danger-soft"
                >
                  Sign out
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-space-3">
              <Link
                to="/login"
                onClick={onClose}
                className="editorial-button px-space-3 py-space-3"
              >
                <User className="h-4 w-4" /> Sign in
              </Link>
              <Link
                to="/signup"
                onClick={onClose}
                className="editorial-button-secondary px-space-3 py-space-3"
              >
                Create account
              </Link>
            </div>
          )}
        </div>
      </aside>
    </div>
  )
}
