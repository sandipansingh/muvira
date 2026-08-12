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
          <div className="px-6 py-3 border-b border-neutral-100">
            <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-2.5">
              Quick Categories
            </p>
            <div className="flex flex-wrap gap-1.5">
              {[
                { label: 'Men', href: '/shop?category=men' },
                { label: 'Women', href: '/shop?category=women' },
                { label: 'Children', href: '/shop?category=children' },
                { label: 'New Arrivals', href: '/shop?sort=newest' },
                { label: 'Best Sellers', href: '/shop?sort=popular' },
              ].map((pill) => (
                <Link
                  key={pill.label}
                  to={pill.href}
                  onClick={onClose}
                  className="rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 text-xs font-semibold text-neutral-800 hover:bg-neutral-900 hover:text-white transition-colors"
                >
                  {pill.label}
                </Link>
              ))}
            </div>
          </div>

          <nav className="px-6 py-3 space-y-0.5 overflow-y-auto max-h-[calc(100vh-280px)]">
            <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 py-1.5">
              Explore Collections
            </p>
            {collectionLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={onClose}
                className="flex items-center justify-between py-2.5 text-sm font-semibold text-foreground hover:text-brand transition-colors border-b border-neutral-50 last:border-none"
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
