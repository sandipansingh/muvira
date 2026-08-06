import React, { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Heart, Menu, Search, ShoppingBag, User, X } from 'lucide-react'
import { useCart } from '../../context/CartContext'
import { useAuth } from '../../context/AuthContext'

interface HeaderProps {
  onOpenMobileMenu?: () => void
}

const navigationLinks = [
  { label: 'Shop', to: '/shop' },
  { label: 'Bestsellers', to: '/shop?sort=popularity' },
  { label: 'Living Room', to: '/shop?category=living-room' },
  { label: 'Bedroom', to: '/shop?category=bedroom' },
  { label: 'Dining', to: '/shop?category=dining' },
]

export const Header: React.FC<HeaderProps> = ({ onOpenMobileMenu }) => {
  const { itemCount, openCartDrawer } = useCart()
  const { isAuthenticated, user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)

  const isHomePage = location.pathname === '/'
  const isOverlay = isHomePage && !isScrolled

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleSearchSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    const query = searchQuery.trim()
    if (!query) return
    navigate(`/shop?q=${encodeURIComponent(query)}`)
    setSearchQuery('')
    setIsSearchOpen(false)
  }

  return (
    <header
      className={`top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isHomePage
          ? `fixed ${
              isOverlay
                ? 'bg-gradient-to-b from-slate-950/80 via-slate-950/40 to-transparent text-white py-2'
                : 'sticky border-b border-slate-200/80 bg-white/95 text-slate-900 backdrop-blur-md shadow-xs py-0'
            }`
          : 'sticky border-b border-slate-200/80 bg-white/95 text-slate-900 backdrop-blur-md shadow-xs py-0'
      }`}
    >
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-20 items-center justify-between gap-4 sm:gap-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onOpenMobileMenu}
              className={`rounded-lg p-2 lg:hidden ${
                isOverlay ? 'text-white hover:bg-white/10' : 'text-slate-700 hover:bg-slate-100'
              }`}
              aria-label="Open mobile menu"
            >
              <Menu className="h-5 w-5" />
            </button>

            <Link
              to="/"
              className={`flex items-center gap-2 text-2xl font-extrabold tracking-tight sm:text-3xl ${
                isOverlay ? 'text-white font-serif' : 'text-slate-900 font-extrabold'
              }`}
            >
              {isOverlay ? (
                <span className="font-serif tracking-tight text-white">Muvira</span>
              ) : (
                <span className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 bg-clip-text text-transparent">
                  Muvira
                </span>
              )}
            </Link>
          </div>

          <nav className="hidden items-center gap-7 text-sm font-medium lg:flex">
            {navigationLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`transition-colors ${
                  isOverlay
                    ? 'text-white/90 hover:text-white font-medium drop-shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 font-semibold'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="hidden max-w-xs flex-1 lg:block">
            <form onSubmit={handleSearchSubmit} className="relative">
              <input
                type="search"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full rounded-full py-2 pl-4 pr-10 text-sm transition-all ${
                  isOverlay
                    ? 'bg-white/20 border border-white/30 text-white placeholder:text-white/70 backdrop-blur-md focus:bg-white focus:text-slate-900 focus:placeholder:text-slate-400 focus:outline-none'
                    : 'border border-slate-200 bg-slate-50/80 text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10'
                }`}
              />
              <button
                type="submit"
                className={`absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1.5 transition-colors ${
                  isOverlay
                    ? 'text-white/70 hover:text-white'
                    : 'text-slate-400 hover:text-slate-700'
                }`}
                aria-label="Search"
              >
                <Search className="h-4 w-4" />
              </button>
            </form>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-3">
            <button
              type="button"
              onClick={() => setIsSearchOpen((open) => !open)}
              className={`rounded-full p-2.5 lg:hidden ${
                isOverlay
                  ? 'bg-white/20 border border-white/30 text-white backdrop-blur-md'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
              aria-label="Search"
              aria-expanded={isSearchOpen}
            >
              <Search className="h-5 w-5" />
            </button>
            <Link
              to="/shop"
              className={`hidden rounded-full p-2.5 sm:block transition-all ${
                isOverlay
                  ? 'bg-white/20 border border-white/30 text-white backdrop-blur-md hover:bg-white/30'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
              aria-label="Browse wishlist"
            >
              <Heart className="h-5 w-5" />
            </Link>
            <div className="relative">
              {isAuthenticated ? (
                <button
                  type="button"
                  onClick={() => setIsUserMenuOpen((open) => !open)}
                  className={`flex items-center gap-2 rounded-full p-2 transition-all ${
                    isOverlay
                      ? 'bg-white/20 border border-white/30 text-white backdrop-blur-md hover:bg-white/30'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                  aria-label="User account"
                  aria-expanded={isUserMenuOpen}
                >
                  <User className="h-5 w-5" />
                  <span className="hidden max-w-24 truncate text-xs font-semibold sm:inline">
                    {user?.fullName.split(' ')[0]}
                  </span>
                </button>
              ) : (
                <Link
                  to="/login"
                  className={`rounded-full p-2.5 block transition-all ${
                    isOverlay
                      ? 'bg-white/20 border border-white/30 text-white backdrop-blur-md hover:bg-white/30'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                  aria-label="Login"
                >
                  <User className="h-5 w-5" />
                </Link>
              )}

              {isAuthenticated && isUserMenuOpen && (
                <div className="absolute right-0 top-full mt-3 w-56 rounded-2xl border border-slate-200/80 bg-white py-2 shadow-lg text-slate-900">
                  <div className="border-b border-slate-100 px-4 py-2.5">
                    <p className="text-xs font-medium text-slate-400">Signed in as</p>
                    <p className="truncate text-sm font-bold text-slate-900">{user?.fullName}</p>
                  </div>
                  <Link
                    to="/profile"
                    onClick={() => setIsUserMenuOpen(false)}
                    className="block px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                  >
                    My Profile
                  </Link>
                  <Link
                    to="/orders"
                    onClick={() => setIsUserMenuOpen(false)}
                    className="block px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                  >
                    My Orders
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setIsUserMenuOpen(false)
                      logout()
                    }}
                    className="block w-full px-4 py-2 text-left text-sm font-semibold text-red-600 hover:bg-red-50"
                  >
                    Sign Out
                  </button>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={openCartDrawer}
              className={`relative rounded-full p-2.5 transition-all ${
                isOverlay
                  ? 'bg-white/20 border border-white/30 text-white backdrop-blur-md hover:bg-white/30'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
              aria-label="Shopping cart"
            >
              <ShoppingBag className="h-5 w-5" />
              {itemCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-orange-600 px-1 text-[10px] font-bold text-white shadow-xs">
                  {itemCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {isSearchOpen && (
        <div className="border-t border-slate-200/80 bg-slate-50 px-4 py-3 lg:hidden text-slate-900">
          <form onSubmit={handleSearchSubmit} className="mx-auto flex max-w-7xl items-center gap-2">
            <label htmlFor="site-search-mobile" className="sr-only">
              Search products
            </label>
            <input
              id="site-search-mobile"
              name="search"
              type="search"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="editorial-input text-sm"
              autoFocus
            />
            <button
              type="submit"
              className="editorial-button shrink-0 py-2.5 text-xs"
              aria-label="Submit search"
            >
              <Search className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setIsSearchOpen(false)}
              className="p-2 text-slate-400 hover:text-slate-700"
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
