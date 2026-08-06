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
  { label: 'Living Room', to: '/shop?category=living-room' },
  { label: 'Bedroom', to: '/shop?category=bedroom' },
  { label: 'Dining', to: '/shop?category=dining' },
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
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 backdrop-blur-md shadow-xs">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-20 items-center justify-between gap-4 sm:gap-8">
          {/* Left: Brand Logo & Mobile Menu Toggle */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onOpenMobileMenu}
              className="rounded-lg p-2 text-slate-700 hover:bg-slate-100 lg:hidden"
              aria-label="Open mobile menu"
            >
              <Menu className="h-5 w-5" />
            </button>

            <Link
              to="/"
              className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl font-sans"
            >
              Muvira
            </Link>
          </div>

          {/* Center: Navigation Links */}
          <nav className="hidden items-center gap-8 text-sm font-semibold text-slate-600 lg:flex">
            {navigationLinks.map((link) => (
              <Link key={link.to} to={link.to} className="transition-colors hover:text-slate-900">
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Right: Search, Wishlist, Cart & Account Button */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Search Trigger */}
            <div className="relative hidden md:block">
              <form onSubmit={handleSearchSubmit} className="relative">
                <input
                  type="search"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-44 rounded-full border border-slate-200 bg-slate-50 py-2 pl-4 pr-9 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:bg-white focus:outline-none transition-all"
                />
                <button
                  type="submit"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 hover:text-slate-900"
                  aria-label="Search"
                >
                  <Search className="h-4 w-4" />
                </button>
              </form>
            </div>

            <button
              type="button"
              onClick={() => setIsSearchOpen((open) => !open)}
              className="rounded-full p-2.5 text-slate-700 hover:bg-slate-100 md:hidden"
              aria-label="Search"
            >
              <Search className="h-5 w-5" />
            </button>

            <Link
              to="/shop"
              className="hidden rounded-full p-2.5 text-slate-700 hover:bg-slate-100 sm:block"
              aria-label="Wishlist"
            >
              <Heart className="h-5 w-5" />
            </Link>

            {/* Shopping Cart Button */}
            <button
              type="button"
              onClick={openCartDrawer}
              className="relative rounded-full p-2.5 text-slate-700 hover:bg-slate-100 transition-colors"
              aria-label="Shopping cart"
            >
              <ShoppingBag className="h-5 w-5" />
              {itemCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-orange-600 px-1 text-[10px] font-bold text-white shadow-xs">
                  {itemCount}
                </span>
              )}
            </button>

            {/* Auth / Account Button */}
            <div className="relative">
              {isAuthenticated ? (
                <button
                  type="button"
                  onClick={() => setIsUserMenuOpen((open) => !open)}
                  className="flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:bg-slate-800"
                >
                  <User className="h-4 w-4" />
                  <span className="max-w-20 truncate">{user?.fullName.split(' ')[0]}</span>
                </button>
              ) : (
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center rounded-full bg-slate-900 px-5 py-2.5 text-xs font-bold text-white shadow-sm transition-all hover:bg-slate-800 active:scale-95"
                >
                  Login
                </Link>
              )}

              {isAuthenticated && isUserMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-52 rounded-2xl border border-slate-200/80 bg-white py-2 shadow-lg z-50">
                  <div className="border-b border-slate-100 px-4 py-2">
                    <p className="text-[11px] font-medium text-slate-400">Signed in as</p>
                    <p className="truncate text-xs font-bold text-slate-900">{user?.fullName}</p>
                  </div>
                  <Link
                    to="/profile"
                    onClick={() => setIsUserMenuOpen(false)}
                    className="block px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    My Profile
                  </Link>
                  <Link
                    to="/orders"
                    onClick={() => setIsUserMenuOpen(false)}
                    className="block px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    My Orders
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setIsUserMenuOpen(false)
                      logout()
                    }}
                    className="block w-full px-4 py-2 text-left text-xs font-semibold text-red-600 hover:bg-red-50"
                  >
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {isSearchOpen && (
        <div className="border-t border-slate-200 bg-slate-50 px-4 py-3 md:hidden">
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
            <input
              type="search"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
              autoFocus
            />
            <button
              type="submit"
              className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white"
            >
              Search
            </button>
            <button
              type="button"
              onClick={() => setIsSearchOpen(false)}
              className="p-2 text-slate-400 hover:text-slate-700"
            >
              <X className="h-5 w-5" />
            </button>
          </form>
        </div>
      )}
    </header>
  )
}
