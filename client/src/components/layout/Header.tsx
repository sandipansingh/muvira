import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { LogOut, Menu, Package, Search, ShoppingBag, User, X } from 'lucide-react'
import { useCart } from '../../context/CartContext'
import { useAuth } from '../../context/AuthContext'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'

interface HeaderProps {
  onOpenMobileMenu?: () => void
}

export const Header: React.FC<HeaderProps> = ({ onOpenMobileMenu }) => {
  const { itemCount, openCartDrawer } = useCart()
  const { isAuthenticated, user, logout } = useAuth()
  const navigate = useNavigate()
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

    navigate(`/search?q=${encodeURIComponent(query)}`)
    setSearchQuery('')
    setIsSearchOpen(false)
  }

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-all duration-200 bg-white/80 backdrop-blur-2xl ${
        scrolled ? 'border-b border-line shadow-xs' : 'border-b border-transparent'
      }`}
    >
      <div className="relative layout-container py-3 sm:py-4 flex items-center justify-between gap-4">
        {/* Left: Hamburger Menu Button (Functional on Desktop & Mobile) */}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onOpenMobileMenu}
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5 stroke-[2]" />
          </Button>
        </div>

        <div className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center pointer-events-auto">
          <Link to="/" className="flex items-center gap-2.5 select-none">
            <img
              src="/logo.png"
              alt="Muvira"
              className="h-7 sm:h-8 md:h-8.5 w-auto object-contain shrink-0"
            />
            <span className="translate-y-[2px] font-display text-xl sm:text-2xl md:text-3xl tracking-tight text-ink leading-none">
              Muvira
            </span>
          </Link>
        </div>

        {/* Right: Search, User, Cart */}
        <div className="flex items-center gap-3 sm:gap-6">
          {/* Search Trigger for Mobile/Header */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setIsSearchOpen((prev) => !prev)}
            className="text-ink-soft md:hidden"
            aria-label="Search products"
          >
            <Search className="w-5 h-5 stroke-[1.75]" />
          </Button>

          {/* User Account / Auth */}
          <div className="relative flex items-center justify-center">
            {isAuthenticated ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setIsUserMenuOpen((prev) => !prev)}
                className="text-ink-soft"
                aria-label="Account menu"
              >
                <User className="w-5 h-5 stroke-[1.75]" />
              </Button>
            ) : (
              <Link
                to="/signin"
                className="flex h-10 w-10 items-center justify-center text-ink-soft hover:text-ink hover:bg-surface rounded-[var(--radius-control)] transition-colors cursor-pointer"
                aria-label="Sign in"
              >
                <User className="w-5 h-5 stroke-[1.75]" />
              </Link>
            )}

            {/* User Dropdown */}
            {isAuthenticated && isUserMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-52 rounded-xl border border-line bg-paper p-2 shadow-premium text-xs font-normal z-50">
                <div className="border-b border-line px-3 py-2">
                  <p className="text-xs font-normal uppercase tracking-wider text-muted">
                    Signed in as
                  </p>
                  <p className="mt-0.5 truncate font-normal text-ink text-xs">
                    {user?.fullName || user?.email}
                  </p>
                </div>
                <Link
                  to="/profile"
                  onClick={() => setIsUserMenuOpen(false)}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-ink hover:bg-surface transition-colors"
                >
                  <User className="h-4 w-4 shrink-0 text-muted" />
                  <span className="leading-none">My Profile</span>
                </Link>
                <Link
                  to="/orders"
                  onClick={() => setIsUserMenuOpen(false)}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-ink hover:bg-surface transition-colors"
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
                  className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-danger hover:bg-danger-soft transition-colors"
                >
                  <LogOut className="h-4 w-4 shrink-0" />
                  <span className="leading-none">Sign Out</span>
                </button>
              </div>
            )}
          </div>

          {/* Shopping Bag Cart Button */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={openCartDrawer}
            className="relative"
            aria-label="Shopping cart"
          >
            <ShoppingBag className="w-5 h-5 stroke-[1.75]" />
            {itemCount > 0 && (
              <span className="absolute top-0.5 right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[11px] font-normal text-white shadow-xs">
                {itemCount}
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* Expandable Search Input Row (Mobile or Toggle) */}
      {isSearchOpen && (
        <div className="layout-container pb-2.5">
          <form
            onSubmit={handleSearchSubmit}
            className="flex items-center bg-paper rounded-[var(--radius-control)] border border-line p-1 pl-4 shadow-xs"
          >
            <Search className="w-4 h-4 text-muted shrink-0" />
            <Input
              type="search"
              autoFocus
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent border-none outline-none px-3 py-1.5 text-sm text-ink placeholder:text-muted focus:ring-0 [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => setIsSearchOpen(false)}
              className="text-muted hover:text-ink"
              aria-label="Close search"
            >
              <X className="w-4 h-4" />
            </Button>
          </form>
        </div>
      )}
    </header>
  )
}

export default Header
