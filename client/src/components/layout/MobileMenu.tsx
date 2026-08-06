import React from 'react'
import { ChevronRight, User, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

interface MobileMenuProps {
  isOpen: boolean
  onClose: () => void
}

const collectionLinks = [
  { label: 'Shop all products', to: '/shop' },
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
      <aside className="relative flex h-full w-[min(88vw,24rem)] flex-col justify-between border-r border-line bg-paper">
        <div>
          <div className="flex items-center justify-between border-b border-line px-6 py-5">
            <Link
              to="/"
              onClick={onClose}
              className="text-2xl font-bold tracking-[-0.06em] text-ink"
            >
              Muvira
            </Link>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-muted-ink transition-colors hover:text-ink"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <nav className="px-6 py-6">
            {collectionLinks.map((link, index) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={onClose}
                className={`flex items-center justify-between border-b border-line py-4 text-sm font-medium text-ink transition-colors hover:text-cognac ${index === 0 ? 'text-base font-semibold' : ''}`}
              >
                {link.label}
                <ChevronRight className="h-4 w-4 text-muted-ink" />
              </Link>
            ))}
          </nav>
        </div>
        <div className="border-t border-line bg-ivory px-6 py-6">
          {isAuthenticated ? (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-semibold text-ink">{user?.fullName}</p>
                <p className="text-xs text-muted-ink">{user?.email}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Link to="/orders" onClick={onClose} className="editorial-button-secondary">
                  My orders
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    logout()
                    onClose()
                  }}
                  className="border border-danger px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-danger transition-colors hover:bg-danger-soft"
                >
                  Sign out
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <Link to="/login" onClick={onClose} className="editorial-button">
                <User className="h-4 w-4" /> Sign in
              </Link>
              <Link to="/signup" onClick={onClose} className="editorial-button-secondary">
                Create account
              </Link>
            </div>
          )}
        </div>
      </aside>
    </div>
  )
}
