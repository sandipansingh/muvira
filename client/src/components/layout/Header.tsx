import React, { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { LogOut, Menu, Package, Search, ShoppingBag, User, X } from 'lucide-react'
import { useCart } from '../../context/CartContext'
import { useAuth } from '../../context/AuthContext'

interface HeaderProps {
  onOpenMobileMenu?: () => void
}

export const Header: React.FC<HeaderProps> = ({ onOpenMobileMenu }) => {
  const { itemCount, openCartDrawer } = useCart()
  const { isAuthenticated, user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 15)
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

  const getHref = (href: string) => {
    if (href.startsWith('/#')) {
      return location.pathname === '/' ? href.replace('/', '') : href
    }
    return href
  }

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-all duration-200 bg-white/80 backdrop-blur-2xl ${
        scrolled ? 'border-b border-line shadow-xs' : 'border-b border-line/60'
      }`}
    >
      <div className="relative layout-container py-3 sm:py-4 flex items-center justify-between gap-4">
        {/* Left: Hamburger Menu Button (Functional on Desktop & Mobile) */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenMobileMenu}
            className="flex h-10 w-10 items-center justify-center text-ink hover:bg-surface rounded-full transition-colors cursor-pointer"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5 stroke-[2]" />
          </button>
        </div>

        <div className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center pointer-events-auto">
          <Link to="/" className="flex items-center gap-2.5 select-none">
            <img
              src="/logo.png"
              alt="Muvira"
              className="h-7 sm:h-8 md:h-8.5 w-auto object-contain shrink-0"
            />
            <span className="translate-y-[2px] font-display text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-ink leading-none">
              Muvira
            </span>
          </Link>
        </div>

        {/* Right: Text Links, Search, User, Cart */}
        <div className="flex items-center gap-3 sm:gap-6">
          <div className="hidden md:flex items-center gap-5 text-xs font-semibold text-ink-soft">
            <Link to={getHref('/#faq')} className="hover:text-ink transition-colors">
              FAQs
            </Link>
          </div>

          {/* Search Trigger for Mobile/Header */}
          <button
            type="button"
            onClick={() => setIsSearchOpen((prev) => !prev)}
            className="flex h-10 w-10 items-center justify-center text-ink-soft hover:text-ink hover:bg-surface rounded-full transition-colors cursor-pointer md:hidden"
            aria-label="Search products"
          >
            <Search className="w-5 h-5 stroke-[1.75]" />
          </button>

          {/* User Account / Auth */}
          <div className="relative flex items-center justify-center">
            {isAuthenticated ? (
              <button
                type="button"
                onClick={() => setIsUserMenuOpen((prev) => !prev)}
                className="flex h-10 w-10 items-center justify-center text-ink-soft hover:text-ink hover:bg-surface rounded-full transition-colors cursor-pointer"
                aria-label="Account menu"
              >
                <User className="w-5 h-5 stroke-[1.75]" />
              </button>
            ) : (
              <Link
                to="/signin"
                className="flex h-10 w-10 items-center justify-center text-ink-soft hover:text-ink hover:bg-surface rounded-full transition-colors cursor-pointer"
                aria-label="Sign in"
              >
                <User className="w-5 h-5 stroke-[1.75]" />
              </Link>
            )}

            {/* User Dropdown */}
            {isAuthenticated && isUserMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-52 rounded-2xl border border-line bg-paper p-2 shadow-premium text-xs font-semibold z-50">
                <div className="border-b border-line px-3 py-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted">
                    Signed in as
                  </p>
                  <p className="mt-0.5 truncate font-bold text-ink text-xs">
                    {user?.fullName || user?.email}
                  </p>
                </div>
                <Link
                  to="/profile"
                  onClick={() => setIsUserMenuOpen(false)}
                  className="flex items-center gap-2 rounded-xl px-3 py-2 text-ink hover:bg-surface transition-colors"
                >
                  <User className="h-4 w-4 shrink-0 text-muted" />
                  <span className="leading-none">My Profile</span>
                </Link>
                <Link
                  to="/orders"
                  onClick={() => setIsUserMenuOpen(false)}
                  className="flex items-center gap-2 rounded-xl px-3 py-2 text-ink hover:bg-surface transition-colors"
                >
                  <Package className="h-4 w-4 shrink-0 text-muted" />
                  <span className="leading-none">My Orders</span>
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setIsUserMenuOpen(false)
                    logout()
                  }}
                  className="flex w-full cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-danger hover:bg-danger-soft transition-colors"
                >
                  <LogOut className="h-4 w-4 shrink-0" />
                  <span className="leading-none">Sign Out</span>
                </button>
              </div>
            )}
          </div>

          {/* Shopping Bag Cart Button */}
          <button
            type="button"
            onClick={openCartDrawer}
            className="relative flex h-10 w-10 items-center justify-center text-ink hover:bg-surface rounded-full transition-colors cursor-pointer"
            aria-label="Shopping cart"
          >
            <ShoppingBag className="w-5 h-5 stroke-[1.75]" />
            {itemCount > 0 && (
              <span className="absolute top-0.5 right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-ink px-1 text-[9px] font-bold text-white shadow-xs">
                {itemCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Expandable Search Input Row (Mobile or Toggle) */}
      {isSearchOpen && (
        <div className="layout-container pb-2.5">
          <form
            onSubmit={handleSearchSubmit}
            className="flex items-center bg-paper rounded-full border border-line p-1 pl-4 shadow-xs"
          >
            <Search className="w-4 h-4 text-muted shrink-0" />
            <input
              type="search"
              autoFocus
              placeholder="Search handcrafted furniture..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent border-none outline-none px-3 text-sm text-ink placeholder-muted"
            />
            <button
              type="button"
              onClick={() => setIsSearchOpen(false)}
              className="p-1.5 rounded-full text-muted hover:text-ink hover:bg-surface transition-colors cursor-pointer"
              aria-label="Close search"
            >
              <X className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </header>
  )
}

export default Header
