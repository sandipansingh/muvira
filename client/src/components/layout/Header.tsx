import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Search, ShoppingBag, User, Menu, X, Heart } from 'lucide-react'
import { useCart } from '../../context/CartContext'
import { useAuth } from '../../context/AuthContext'

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

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      navigate(`/shop?q=${encodeURIComponent(searchQuery.trim())}`)
      setIsSearchOpen(false)
      setSearchQuery('')
    }
  }

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-zinc-100 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Mobile menu trigger button */}
          <button
            onClick={onOpenMobileMenu}
            className="lg:hidden p-2 text-zinc-700 hover:text-zinc-900 rounded-lg hover:bg-zinc-100 transition-colors"
            aria-label="Open mobile menu"
          >
            <Menu className="w-6 h-6" />
          </button>

          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-2">
            <span className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900">
              Muvira
            </span>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center space-x-8 text-sm font-medium text-zinc-700">
            <Link to="/shop" className="hover:text-[#C88D35] transition-colors py-2">
              New Arrivals
            </Link>
            <Link
              to="/shop?category=living-room"
              className="hover:text-[#C88D35] transition-colors py-2"
            >
              Living Room
            </Link>
            <Link
              to="/shop?category=bedroom"
              className="hover:text-[#C88D35] transition-colors py-2"
            >
              Bedroom
            </Link>
            <Link
              to="/shop?category=dining"
              className="hover:text-[#C88D35] transition-colors py-2"
            >
              Dining
            </Link>
            <Link
              to="/shop?category=office-decor"
              className="hover:text-[#C88D35] transition-colors py-2"
            >
              Office & Decor
            </Link>
            <Link to="/shop" className="hover:text-[#C88D35] transition-colors py-2">
              All Collections
            </Link>
          </nav>

          {/* Action Controls */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            {/* Search Button */}
            <button
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              className="p-2 text-zinc-700 hover:text-[#C88D35] rounded-full hover:bg-zinc-100 transition-colors"
              aria-label="Search"
            >
              <Search className="w-5 h-5" />
            </button>

            {/* Wishlist */}
            <Link
              to="/shop"
              className="hidden sm:flex p-2 text-zinc-700 hover:text-[#C88D35] rounded-full hover:bg-zinc-100 transition-colors"
              aria-label="Wishlist"
            >
              <Heart className="w-5 h-5" />
            </Link>

            {/* Account dropdown */}
            <div className="relative">
              {isAuthenticated ? (
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="p-2 text-zinc-700 hover:text-[#C88D35] rounded-full hover:bg-zinc-100 transition-colors flex items-center gap-1.5"
                  aria-label="User account"
                >
                  <User className="w-5 h-5" />
                  <span className="hidden sm:inline text-xs font-semibold max-w-[80px] truncate">
                    {user?.fullName.split(' ')[0]}
                  </span>
                </button>
              ) : (
                <Link
                  to="/login"
                  className="p-2 text-zinc-700 hover:text-[#C88D35] rounded-full hover:bg-zinc-100 transition-colors"
                  aria-label="Login"
                >
                  <User className="w-5 h-5" />
                </Link>
              )}

              {isUserMenuOpen && isAuthenticated && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-zinc-100 py-2 z-50">
                  <div className="px-4 py-2 border-b border-zinc-100">
                    <p className="text-xs text-zinc-400">Signed in as</p>
                    <p className="text-sm font-semibold text-zinc-900 truncate">{user?.fullName}</p>
                  </div>
                  <Link
                    to="/profile"
                    onClick={() => setIsUserMenuOpen(false)}
                    className="block px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
                  >
                    My Profile
                  </Link>
                  <Link
                    to="/orders"
                    onClick={() => setIsUserMenuOpen(false)}
                    className="block px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
                  >
                    My Orders
                  </Link>
                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false)
                      logout()
                    }}
                    className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    Sign Out
                  </button>
                </div>
              )}
            </div>

            {/* Cart Counter Button */}
            <button
              onClick={openCartDrawer}
              className="relative p-2 text-zinc-900 hover:text-[#C88D35] rounded-full hover:bg-zinc-100 transition-colors"
              aria-label="Shopping Cart"
            >
              <ShoppingBag className="w-5 h-5" />
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#C88D35] text-white text-[11px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-xs">
                  {itemCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Expandable Search Drawer */}
      {isSearchOpen && (
        <div className="border-t border-zinc-100 bg-[#F6F4EF] p-4 transition-all animate-fadeIn">
          <form onSubmit={handleSearchSubmit} className="max-w-3xl mx-auto relative flex">
            <input
              type="text"
              placeholder="Search solid wood sofas, tables, dining chairs, lamps..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-zinc-300 rounded-full pl-5 pr-12 py-3 text-base text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#C88D35]"
              autoFocus
            />
            <button
              type="submit"
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-zinc-600 hover:text-[#C88D35]"
            >
              <Search className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => setIsSearchOpen(false)}
              className="ml-3 text-sm text-zinc-500 hover:text-zinc-900 font-medium shrink-0 self-center"
            >
              <X className="w-5 h-5" />
            </button>
          </form>
        </div>
      )}
    </header>
  )
}
