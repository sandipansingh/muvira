import React from 'react'
import { ChevronRight, User, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

interface MobileMenuProps {
  isOpen: boolean
  onClose: () => void
}

const collectionLinks = [
  { label: 'Home', to: '/' },
  { label: 'Shop All', to: '/shop' },
  { label: 'Living Room', to: '/shop?category=living-room' },
  { label: 'Bedroom', to: '/shop?category=bedroom' },
  { label: 'Dining', to: '/shop?category=dining' },
  { label: 'Why Choose Us', to: '/#why-choose-us' },
  { label: 'Customer Reviews', to: '/reviews' },
  { label: 'FAQ', to: '/#faq' },
]

export const MobileMenu: React.FC<MobileMenuProps> = ({ isOpen, onClose }) => {
  const { isAuthenticated, user, logout } = useAuth()

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-label="Main menu"
    >
      <button
        type="button"
        className="absolute inset-0 h-full w-full bg-black/40 backdrop-blur-xs"
        onClick={onClose}
        aria-label="Close mobile menu"
      />
      <aside className="relative flex h-full w-[min(88vw,22rem)] flex-col justify-between border-r border-border-light bg-white shadow-2xl">
        <div>
          <div className="flex items-center justify-between border-b border-border-light px-6 py-5">
            <Link
              to="/"
              onClick={onClose}
              className="font-display text-base font-bold tracking-wider uppercase text-foreground"
            >
              Muvira
            </Link>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-full border border-border-light text-foreground hover:bg-neutral-50 transition-colors"
              aria-label="Close menu"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <nav className="px-6 py-4 space-y-1">
            {collectionLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={onClose}
                className="flex items-center justify-between py-3 text-sm font-semibold text-foreground hover:text-brand transition-colors border-b border-neutral-100 last:border-none"
              >
                <span>{link.label}</span>
                <ChevronRight className="h-4 w-4 text-neutral-400" />
              </Link>
            ))}
          </nav>
        </div>

        <div className="border-t border-border-light bg-neutral-50/70 p-6">
          {isAuthenticated ? (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-bold text-foreground">{user?.fullName}</p>
                <p className="text-xs text-muted">{user?.email}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Link
                  to="/orders"
                  onClick={onClose}
                  className="editorial-button-secondary py-2.5 text-xs text-center justify-center font-bold"
                >
                  My Orders
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    logout()
                    onClose()
                  }}
                  className="rounded-full border border-red-200 bg-red-50 text-xs font-bold text-red-600 hover:bg-red-100 transition-colors py-2.5 cursor-pointer"
                >
                  Sign Out
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <Link
                to="/login"
                onClick={onClose}
                className="editorial-button py-2.5 text-xs text-center justify-center font-bold"
              >
                <User className="h-3.5 w-3.5" /> Sign In
              </Link>
              <Link
                to="/signup"
                onClick={onClose}
                className="editorial-button-secondary py-2.5 text-xs text-center justify-center font-bold"
              >
                Sign Up
              </Link>
            </div>
          )}
        </div>
      </aside>
    </div>
  )
}

export default MobileMenu
