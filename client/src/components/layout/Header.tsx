import React, { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Heart, LogOut, Menu, Package, Search, ShoppingBag, User, X } from 'lucide-react'
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
    <header className="sticky top-0 lg:top-3.5 z-50 transition-all duration-300 w-full">
      {/* Mobile Header (Matches user uploaded Image 1: hamburger left, MUVIRA center, bag right, blur background) */}
      <div className="flex lg:hidden items-center justify-between px-4 py-3 bg-white/85 backdrop-blur-md border-b border-neutral-200/70 shadow-xs">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="p-2 -ml-1 text-foreground hover:bg-neutral-100/80 rounded-full transition-colors cursor-pointer"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5 stroke-[2]" />
        </button>

        <Link to="/" className="flex items-center select-none">
          <span className="font-display text-base font-bold tracking-[0.18em] uppercase text-foreground">
            Muvira
          </span>
        </Link>

        <button
          type="button"
          onClick={openCartDrawer}
          className="relative p-2 -mr-1 text-foreground hover:bg-neutral-100/80 rounded-full transition-colors cursor-pointer"
          aria-label="Shopping cart"
        >
          <ShoppingBag className="w-5 h-5 stroke-[1.75]" />
          {itemCount > 0 && (
            <span className="absolute -bottom-0.5 -left-0.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-neutral-900 px-1 text-[10px] font-bold text-white shadow-xs">
              {itemCount}
            </span>
          )}
        </button>
      </div>

      {/* Desktop Header (Floating Pill Navbar with blur effect) */}
      <div className="hidden lg:block layout-container">
        <nav
          className={`flex items-center justify-between rounded-full px-6 py-2.5 transition-all duration-300 ${
            scrolled
              ? 'bg-white/95 backdrop-blur-md shadow-premium border border-neutral-200/80'
              : 'bg-white/85 backdrop-blur-md shadow-premium border border-neutral-200/60'
          }`}
        >
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-3 group shrink-0 select-none">
            <span className="block font-display text-lg font-bold tracking-[0.16em] uppercase leading-none text-foreground transition-colors group-hover:text-brand">
              Muvira
            </span>
          </Link>

          {/* Center Desktop Navigation Links */}
          <div className="flex items-center gap-4 xl:gap-7">
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
          <div className="flex items-center gap-2 xl:gap-3">
            {/* Search Button */}
            <button
              type="button"
              onClick={() => setIsSearchOpen((prev) => !prev)}
              className="p-2.5 rounded-full border border-border-light text-foreground hover:bg-neutral-50 hover:text-brand hover:border-neutral-300 transition-all duration-200 cursor-pointer"
              aria-label="Search products"
            >
              <Search className="w-4 h-4" />
            </button>

            {/* Wishlist Link */}
            <Link
              to="/shop"
              className="p-2.5 rounded-full border border-border-light text-foreground hover:bg-neutral-50 hover:text-brand hover:border-neutral-300 transition-all duration-200 cursor-pointer"
              aria-label="Wishlist"
            >
              <Heart className="w-4 h-4" />
            </Link>

            {/* Cart Button */}
            <button
              type="button"
              onClick={openCartDrawer}
              className="relative p-2.5 rounded-full border border-border-light text-foreground hover:bg-neutral-50 hover:text-brand hover:border-neutral-300 transition-all duration-200 cursor-pointer"
              aria-label="Shopping cart"
            >
              <ShoppingBag className="w-4 h-4" />
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
                  className="p-2.5 rounded-full border border-border-light text-foreground hover:bg-neutral-50 hover:text-brand hover:border-neutral-300 transition-all duration-200 cursor-pointer"
                  aria-label="Account menu"
                >
                  <User className="w-4 h-4" />
                </button>
              ) : (
                <Link
                  to="/login"
                  className="p-2.5 rounded-full border border-border-light text-foreground hover:bg-neutral-50 hover:text-brand hover:border-neutral-300 transition-all duration-200 cursor-pointer"
                  aria-label="Sign in"
                >
                  <User className="w-4 h-4" />
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
                    className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-foreground hover:bg-neutral-50 transition-colors"
                  >
                    <User className="h-4 w-4 text-muted" />
                    <span>My Profile</span>
                  </Link>
                  <Link
                    to="/orders"
                    onClick={() => setIsUserMenuOpen(false)}
                    className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-foreground hover:bg-neutral-50 transition-colors"
                  >
                    <Package className="h-4 w-4 text-muted" />
                    <span>My Orders</span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setIsUserMenuOpen(false)
                      logout()
                    }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </nav>
      </div>

      {/* Expandable Search Overlay */}
      {isSearchOpen && (
        <div className="layout-container mt-2">
          <form
            onSubmit={handleSearchSubmit}
            className="flex items-center bg-white/95 backdrop-blur-md rounded-full border border-neutral-200 p-1.5 pl-5 shadow-premium"
          >
            <Search className="w-4 h-4 text-neutral-400 shrink-0" />
            <input
              type="search"
              autoFocus
              placeholder="Search handcrafted beds, dining tables, chairs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent border-none outline-none px-3 text-base text-foreground placeholder-neutral-400"
            />
            <button
              type="button"
              onClick={() => setIsSearchOpen(false)}
              className="p-2 rounded-full text-neutral-400 hover:text-foreground hover:bg-neutral-100 transition-colors cursor-pointer"
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
