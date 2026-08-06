import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Heart, Menu, Search, ShoppingBag, User, X } from 'lucide-react'
import { useCart } from '../../context/CartContext'
import { useAuth } from '../../context/AuthContext'

interface HeaderProps {
  onOpenMobileMenu?: () => void
}

const navigationLinks = [
  { label: 'New Arrivals', to: '/shop' },
  { label: 'Living Room', to: '/shop?category=living-room' },
  { label: 'Bedroom', to: '/shop?category=bedroom' },
  { label: 'Dining', to: '/shop?category=dining' },
  { label: 'Office & Decor', to: '/shop?category=office-decor' },
]

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
    <header className="sticky top-0 z-40 border-b border-line bg-paper">
      <div className="editorial-container">
        <div className="flex min-h-20 items-center justify-between gap-6">
          <button
            type="button"
            onClick={onOpenMobileMenu}
            className="p-2 text-ink transition-colors hover:text-cognac lg:hidden"
            aria-label="Open mobile menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          <Link
            to="/"
            className="shrink-0 text-2xl font-bold tracking-[-0.06em] text-ink sm:text-3xl"
          >
            Muvira
          </Link>

          <nav className="hidden items-center gap-6 text-xs font-medium tracking-wide text-muted-ink lg:flex">
            {navigationLinks.map((link) => (
              <Link key={link.to} to={link.to} className="py-2 transition-colors hover:text-cognac">
                {link.label}
              </Link>
            ))}
            <Link to="/shop" className="py-2 transition-colors hover:text-cognac">
              All Collections
            </Link>
          </nav>

          <div className="flex items-center gap-1 sm:gap-3">
            <button
              type="button"
              onClick={() => setIsSearchOpen((open) => !open)}
              className="p-2 text-ink transition-colors hover:text-cognac"
              aria-label="Search"
              aria-expanded={isSearchOpen}
            >
              <Search className="h-5 w-5" />
            </button>
            <Link
              to="/shop"
              className="hidden p-2 text-ink transition-colors hover:text-cognac sm:block"
              aria-label="Browse collection"
            >
              <Heart className="h-5 w-5" />
            </Link>
            <div className="relative">
              {isAuthenticated ? (
                <button
                  type="button"
                  onClick={() => setIsUserMenuOpen((open) => !open)}
                  className="flex items-center gap-1.5 p-2 text-ink transition-colors hover:text-cognac"
                  aria-label="User account"
                  aria-expanded={isUserMenuOpen}
                >
                  <User className="h-5 w-5" />
                  <span className="hidden max-w-20 truncate text-xs font-semibold sm:inline">
                    {user?.fullName.split(' ')[0]}
                  </span>
                </button>
              ) : (
                <Link
                  to="/login"
                  className="p-2 text-ink transition-colors hover:text-cognac"
                  aria-label="Login"
                >
                  <User className="h-5 w-5" />
                </Link>
              )}

              {isAuthenticated && isUserMenuOpen && (
                <div className="absolute right-0 top-full mt-3 w-52 border border-line bg-paper py-2">
                  <div className="border-b border-line px-4 py-2">
                    <p className="text-xs text-muted-ink">Signed in as</p>
                    <p className="truncate text-sm font-semibold text-ink">{user?.fullName}</p>
                  </div>
                  <Link
                    to="/profile"
                    onClick={() => setIsUserMenuOpen(false)}
                    className="block px-4 py-2 text-sm text-ink transition-colors hover:bg-ivory"
                  >
                    My Profile
                  </Link>
                  <Link
                    to="/orders"
                    onClick={() => setIsUserMenuOpen(false)}
                    className="block px-4 py-2 text-sm text-ink transition-colors hover:bg-ivory"
                  >
                    My Orders
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setIsUserMenuOpen(false)
                      logout()
                    }}
                    className="block w-full px-4 py-2 text-left text-sm text-danger transition-colors hover:bg-danger-soft"
                  >
                    Sign Out
                  </button>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={openCartDrawer}
              className="relative p-2 text-ink transition-colors hover:text-cognac"
              aria-label="Shopping cart"
            >
              <ShoppingBag className="h-5 w-5" />
              {itemCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center bg-cognac px-1 text-[10px] font-bold text-paper">
                  {itemCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {isSearchOpen && (
        <div className="border-t border-line bg-ivory px-4 py-4">
          <form
            onSubmit={handleSearchSubmit}
            className="editorial-container flex items-center gap-3"
          >
            <label htmlFor="site-search" className="sr-only">
              Search products
            </label>
            <input
              id="site-search"
              name="search"
              type="search"
              placeholder="Search the collection"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="editorial-input"
              autoFocus
            />
            <button type="submit" className="editorial-button shrink-0" aria-label="Submit search">
              <Search className="h-4 w-4" />
              <span className="hidden sm:inline">Search</span>
            </button>
            <button
              type="button"
              onClick={() => setIsSearchOpen(false)}
              className="p-2 text-muted-ink transition-colors hover:text-ink"
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
