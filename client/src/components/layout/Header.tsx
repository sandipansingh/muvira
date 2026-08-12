import React, { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
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
  { label: 'Why Us', to: '/#why-choose-us' },
  { label: 'FAQ', to: '/#faq' },
]

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
      setScrolled(window.scrollY > 20)
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
    <header className="sticky top-3 lg:top-4 z-50 layout-container transition-all duration-300 pointer-events-none">
      <nav
        className={`pointer-events-auto flex items-center justify-between rounded-full px-5 sm:px-6 py-2.5 transition-all duration-300 ${
          scrolled
            ? 'bg-white/95 backdrop-blur-md shadow-premium border border-border-light/80'
            : 'bg-white/90 backdrop-blur-md shadow-premium border border-border-light/60'
        }`}
      >
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-3 group shrink-0 select-none">
          <div className="flex flex-col">
            <span className="block font-display text-sm sm:text-base lg:text-lg font-bold tracking-[0.16em] uppercase leading-none text-foreground transition-colors group-hover:text-brand">
              Muvira
            </span>
            <span className="block font-sans text-[8px] sm:text-[9px] font-semibold tracking-[0.22em] uppercase leading-none mt-1 text-muted">
              Artisanal Living
            </span>
          </div>
        </Link>

        {/* Center Desktop Navigation */}
        <div className="hidden lg:flex items-center gap-4 xl:gap-7">
          {navigationLinks.map((link) => (
            <Link
              key={link.label}
              to={getHref(link.to)}
              className="font-semibold text-[13px] xl:text-sm text-foreground hover:text-brand transition-colors duration-200"
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Right Action Icons */}
        <div className="flex items-center gap-1.5 sm:gap-3">
          {/* Search Button */}
          <button
            type="button"
            onClick={() => setIsSearchOpen((prev) => !prev)}
            className="p-2 sm:p-2.5 rounded-full border border-border-light text-foreground hover:bg-neutral-50 hover:text-brand hover:border-neutral-300 transition-all duration-200 cursor-pointer"
            aria-label="Search products"
          >
            <Search className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
          </button>

          {/* Wishlist Link */}
          <Link
            to="/shop"
            className="hidden sm:flex p-2 sm:p-2.5 rounded-full border border-border-light text-foreground hover:bg-neutral-50 hover:text-brand hover:border-neutral-300 transition-all duration-200 cursor-pointer"
            aria-label="Wishlist"
          >
            <Heart className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
          </Link>

          {/* Cart Button */}
          <button
            type="button"
            onClick={openCartDrawer}
            className="relative p-2 sm:p-2.5 rounded-full border border-border-light text-foreground hover:bg-neutral-50 hover:text-brand hover:border-neutral-300 transition-all duration-200 cursor-pointer"
            aria-label="Shopping cart"
          >
            <ShoppingBag className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            {itemCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-neutral-900 px-1 text-[10px] font-bold text-white shadow-xs">
                {itemCount}
              </span>
            )}
          </button>

          {/* User Account / Auth */}
          <div className="relative">
            {isAuthenticated ? (
              <button
                type="button"
                onClick={() => setIsUserMenuOpen((prev) => !prev)}
                className="p-2 sm:p-2.5 rounded-full border border-border-light text-foreground hover:bg-neutral-50 hover:text-brand hover:border-neutral-300 transition-all duration-200 cursor-pointer"
                aria-label="Account menu"
              >
                <User className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
              </button>
            ) : (
              <Link
                to="/login"
                className="p-2 sm:p-2.5 rounded-full border border-border-light text-foreground hover:bg-neutral-50 hover:text-brand hover:border-neutral-300 transition-all duration-200 cursor-pointer"
                aria-label="Sign in"
              >
                <User className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
              </Link>
            )}

            {/* User Dropdown */}
            {isAuthenticated && isUserMenuOpen && (
              <div className="absolute right-0 top-full mt-3 w-56 rounded-2xl border border-border-light bg-white p-2 shadow-premium text-xs font-semibold z-50">
                <div className="border-b border-border-light px-3 py-2.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted">
                    Signed in as
                  </p>
                  <p className="mt-0.5 truncate font-bold text-foreground text-sm">
                    {user?.fullName || user?.email}
                  </p>
                </div>
                <Link
                  to="/profile"
                  onClick={() => setIsUserMenuOpen(false)}
                  className="block rounded-xl px-3 py-2 text-foreground hover:bg-neutral-50 hover:text-brand transition-colors"
                >
                  My Account
                </Link>
                <Link
                  to="/orders"
                  onClick={() => setIsUserMenuOpen(false)}
                  className="block rounded-xl px-3 py-2 text-foreground hover:bg-neutral-50 hover:text-brand transition-colors"
                >
                  Order History
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setIsUserMenuOpen(false)
                    logout()
                  }}
                  className="block w-full text-left rounded-xl px-3 py-2 font-bold text-red-600 hover:bg-red-50 transition-colors"
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>

          {/* Mobile Menu Toggle Button */}
          <button
            type="button"
            onClick={onOpenMobileMenu}
            className="lg:hidden p-2 rounded-full border border-border-light text-foreground hover:bg-neutral-50 hover:text-brand transition-all cursor-pointer"
            aria-label="Toggle mobile menu"
          >
            <Menu className="w-4.5 h-4.5" />
          </button>
        </div>
      </nav>

      {/* Expandable Search Overlay */}
      {isSearchOpen && (
        <div className="pointer-events-auto mt-2 rounded-2xl border border-border-light bg-white/95 backdrop-blur-md p-3 shadow-premium animate-in fade-in slide-in-from-top-2 duration-200">
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
            <Search className="w-4 h-4 text-muted shrink-0 ml-2" />
            <input
              type="search"
              placeholder="Search handcrafted solid wood furniture, dining, decor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent border-none outline-none text-base text-foreground placeholder-neutral-400 py-1.5 px-2"
              autoFocus
            />
            <button type="submit" className="editorial-button py-2 px-5 text-xs font-bold shrink-0">
              Search
            </button>
            <button
              type="button"
              onClick={() => setIsSearchOpen(false)}
              className="p-2 text-muted hover:text-foreground rounded-full"
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
