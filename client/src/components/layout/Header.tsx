import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Heart, Menu, Search, ShoppingBag, User, X } from 'lucide-react'
import { useCart } from '../../context/CartContext'
import { useAuth } from '../../context/AuthContext'

interface HeaderProps {
  onOpenMobileMenu?: () => void
}

const navigationLinks = [
  { label: 'Home', to: '/' },
  { label: 'Shop', to: '/shop' },
  { label: 'Living room', to: '/shop?category=living-room' },
  { label: 'Bedroom', to: '/shop?category=bedroom' },
  { label: 'Dining', to: '/shop?category=dining' },
]

const headerIconButtonClassName =
  'inline-flex min-h-11 min-w-11 items-center justify-center rounded-pill p-3 text-ink transition-colors duration-control hover:bg-surface'

export const Header: React.FC<HeaderProps> = ({ onOpenMobileMenu }) => {
  const { itemCount, openCartDrawer } = useCart()
  const { isAuthenticated, user, logout } = useAuth()
  const navigate = useNavigate()
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)

  const handleSearchSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    const query = searchQuery.trim()

    if (!query) return

    navigate(`/shop?q=${encodeURIComponent(query)}`)
    setSearchQuery('')
    setIsSearchOpen(false)
  }

  return (
    <header className="sticky top-0 z-50 border-b border-rule bg-paper">
      <div className="editorial-container">
        <div className="flex min-h-16 items-center justify-between gap-space-4">
          <div className="flex items-center gap-space-2">
            <button
              type="button"
              onClick={onOpenMobileMenu}
              className={`${headerIconButtonClassName} lg:hidden`}
              aria-label="Open mobile menu"
            >
              <Menu className="h-5 w-5" />
            </button>

            <Link
              to="/"
              className="font-display text-heading-s-mobile font-bold tracking-tight text-ink"
            >
              Muvira
            </Link>
          </div>

          <nav className="hidden items-center gap-space-6 text-ui font-semibold text-muted lg:flex">
            {navigationLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="transition-colors duration-control hover:text-terracotta"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-space-1 sm:gap-space-2">
            <div className="relative hidden md:block">
              <form onSubmit={handleSearchSubmit} className="relative">
                <input
                  type="search"
                  placeholder="Search products"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  className="w-48 rounded-control border border-rule bg-surface py-space-2 pl-space-3 pr-10 text-base text-ink placeholder:text-muted transition-colors duration-control focus:border-ink focus:outline-none"
                />
                <button
                  type="submit"
                  className="absolute right-space-1 top-1/2 -translate-y-1/2 rounded-pill p-space-2 text-muted transition-colors duration-control hover:text-terracotta"
                  aria-label="Search"
                >
                  <Search className="h-4 w-4" />
                </button>
              </form>
            </div>

            <button
              type="button"
              onClick={() => setIsSearchOpen((open) => !open)}
              className={`${headerIconButtonClassName} md:hidden`}
              aria-label="Search"
            >
              <Search className="h-5 w-5" />
            </button>

            <Link
              to="/shop"
              className={`${headerIconButtonClassName} hidden sm:inline-flex`}
              aria-label="Wishlist"
            >
              <Heart className="h-5 w-5" />
            </Link>

            <button
              type="button"
              onClick={openCartDrawer}
              className={`${headerIconButtonClassName} relative`}
              aria-label="Shopping cart"
            >
              <ShoppingBag className="h-5 w-5" />
              {itemCount > 0 && (
                <span className="absolute right-0 top-0 flex min-h-5 min-w-5 items-center justify-center rounded-pill bg-ink px-space-1 text-eyebrow-mobile font-semibold text-paper">
                  {itemCount}
                </span>
              )}
            </button>

            <div className="relative">
              {isAuthenticated ? (
                <button
                  type="button"
                  onClick={() => setIsUserMenuOpen((open) => !open)}
                  className={headerIconButtonClassName}
                  aria-label="Open account menu"
                >
                  <User className="h-5 w-5" />
                </button>
              ) : (
                <Link to="/login" className={headerIconButtonClassName} aria-label="Sign in">
                  <User className="h-5 w-5" />
                </Link>
              )}

              {isAuthenticated && isUserMenuOpen && (
                <div className="absolute right-0 top-full mt-space-2 w-56 border border-rule bg-paper py-space-2 text-ui text-ink">
                  <div className="border-b border-rule px-space-4 py-space-3">
                    <p className="text-muted">Signed in as</p>
                    <p className="mt-space-1 truncate font-semibold">{user?.fullName}</p>
                  </div>
                  <Link
                    to="/profile"
                    onClick={() => setIsUserMenuOpen(false)}
                    className="block px-space-4 py-space-3 transition-colors duration-control hover:bg-surface"
                  >
                    My account
                  </Link>
                  <Link
                    to="/orders"
                    onClick={() => setIsUserMenuOpen(false)}
                    className="block px-space-4 py-space-3 transition-colors duration-control hover:bg-surface"
                  >
                    Orders
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setIsUserMenuOpen(false)
                      logout()
                    }}
                    className="block w-full px-space-4 py-space-3 text-left font-semibold text-danger transition-colors duration-control hover:bg-danger-soft"
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {isSearchOpen && (
        <div className="border-t border-rule bg-surface md:hidden">
          <form
            onSubmit={handleSearchSubmit}
            className="editorial-container flex items-center gap-space-2 py-space-3"
          >
            <input
              type="search"
              placeholder="Search products"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="min-w-0 flex-1 rounded-control border border-rule bg-paper px-space-3 py-space-2 text-base text-ink placeholder:text-muted focus:border-ink focus:outline-none"
              autoFocus
            />
            <button type="submit" className="editorial-button px-space-4 py-space-2">
              Search
            </button>
            <button
              type="button"
              onClick={() => setIsSearchOpen(false)}
              className={headerIconButtonClassName}
              aria-label="Close search"
            >
              <X className="h-5 w-5" />
            </button>
          </form>
        </div>
      )}
    </header>
  )
}
