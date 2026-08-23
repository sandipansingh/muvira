import React, { useState } from 'react'
import { ChevronDown, Heart, LogOut, Package, Search, ShoppingBag, X } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useCart } from '../../context/CartContext'

interface MobileMenuProps {
  isOpen: boolean
  onClose: () => void
}

const SHOP_CATEGORIES = [
  { label: 'All Products', href: '/shop' },
  { label: 'Living Room', href: '/shop?category=living-room' },
  { label: 'Bedroom Furniture', href: '/shop?category=bedroom' },
  { label: 'Dining & Kitchen', href: '/shop?category=dining' },
  { label: 'Office & Decor', href: '/shop?category=office-decor' },
]

const PRODUCT_LINKS = [
  { label: 'New Arrivals', href: '/shop?sort=newest' },
  { label: 'Best Sellers', href: '/shop?sort=popularity' },
  { label: 'Customer Reviews', href: '/reviews' },
]

export const MobileMenu: React.FC<MobileMenuProps> = ({ isOpen, onClose }) => {
  const { isAuthenticated, user, logout } = useAuth()
  const { itemCount, openCartDrawer } = useCart()
  const [searchQuery, setSearchQuery] = useState('')
  const [isShopExpanded, setIsShopExpanded] = useState(false)
  const [isProductExpanded, setIsProductExpanded] = useState(false)
  const navigate = useNavigate()

  if (!isOpen) return null

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const query = searchQuery.trim()
    if (!query) return
    navigate(`/shop?q=${encodeURIComponent(query)}`)
    setSearchQuery('')
    onClose()
  }

  const handleOpenCart = () => {
    onClose()
    openCartDrawer()
  }

  return (
    <div
      className="fixed inset-0 z-50 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-label="Main menu"
    >
      {/* Backdrop */}
      <button
        type="button"
        className="absolute inset-0 h-full w-full bg-black/40 backdrop-blur-xs"
        onClick={onClose}
        aria-label="Close mobile menu"
      />

      {/* Drawer Container */}
      <aside className="relative flex h-full w-[min(90vw,24rem)] flex-col justify-between border-r border-kit-line bg-kit-paper shadow-2xl overflow-y-auto">
        <div className="p-6">
          {/* Header with Brand Logo & Close X */}
          <div className="flex items-center justify-between pb-5">
            <Link
              to="/"
              onClick={onClose}
              className="flex items-center gap-2 font-display text-xl font-bold tracking-tight text-kit-ink"
            >
              <span>Muvira.</span>
            </Link>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-kit-ink hover:bg-kit-surface rounded-full transition-colors cursor-pointer"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Search Box Enclosure (Reference Style) */}
          <form onSubmit={handleSearchSubmit} className="my-3">
            <div className="flex items-center gap-2.5 rounded-lg border border-kit-field-border bg-white px-3.5 py-2.5 focus-within:border-kit-ink transition-colors">
              <Search className="h-5 w-5 text-kit-muted shrink-0" />
              <input
                type="search"
                placeholder="Search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent text-sm text-kit-ink placeholder:text-kit-muted outline-none"
              />
            </div>
          </form>

          {/* Main Navigation List */}
          <nav className="mt-4 divide-y divide-kit-line">
            {/* Home */}
            <div className="py-3.5">
              <Link
                to="/"
                onClick={onClose}
                className="text-sm font-medium text-kit-ink hover:underline transition-colors block"
              >
                Home
              </Link>
            </div>

            {/* Shop (with Dropdown) */}
            <div className="py-3.5">
              <button
                type="button"
                onClick={() => setIsShopExpanded((prev) => !prev)}
                className="flex items-center justify-between w-full text-sm font-medium text-kit-ink hover:underline transition-colors cursor-pointer"
              >
                <span>Shop</span>
                <ChevronDown
                  className={`h-4 w-4 text-kit-muted transition-transform duration-200 ${
                    isShopExpanded ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {isShopExpanded && (
                <div className="mt-2 pl-3 space-y-2 border-l border-kit-line">
                  {SHOP_CATEGORIES.map((category) => (
                    <Link
                      key={category.label}
                      to={category.href}
                      onClick={onClose}
                      className="block text-xs font-medium text-kit-muted hover:text-kit-ink py-1 transition-colors"
                    >
                      {category.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Product (with Dropdown) */}
            <div className="py-3.5">
              <button
                type="button"
                onClick={() => setIsProductExpanded((prev) => !prev)}
                className="flex items-center justify-between w-full text-sm font-medium text-kit-ink hover:underline transition-colors cursor-pointer"
              >
                <span>Product</span>
                <ChevronDown
                  className={`h-4 w-4 text-kit-muted transition-transform duration-200 ${
                    isProductExpanded ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {isProductExpanded && (
                <div className="mt-2 pl-3 space-y-2 border-l border-kit-line">
                  {PRODUCT_LINKS.map((link) => (
                    <Link
                      key={link.label}
                      to={link.href}
                      onClick={onClose}
                      className="block text-xs font-medium text-kit-muted hover:text-kit-ink py-1 transition-colors"
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Contact Us / FAQs */}
            <div className="py-3.5">
              <Link
                to="/#faq"
                onClick={onClose}
                className="text-sm font-medium text-kit-ink hover:underline transition-colors block"
              >
                Contact Us
              </Link>
            </div>
          </nav>
        </div>

        {/* Bottom Actions Section (Cart, Wishlist & Sign In) */}
        <div className="p-6 border-t border-kit-line space-y-4">
          {/* Cart Row with Bag Icon & Counter */}
          <button
            type="button"
            onClick={handleOpenCart}
            className="flex items-center justify-between w-full py-1 text-sm font-medium text-kit-ink hover:underline transition-colors cursor-pointer"
          >
            <span>Cart</span>
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-kit-ink stroke-[1.75]" />
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-kit-ink text-[11px] font-bold text-white">
                {itemCount}
              </span>
            </div>
          </button>

          {/* Wishlist Row with Heart Icon & Counter */}
          <Link
            to="/shop"
            onClick={onClose}
            className="flex items-center justify-between w-full py-1 text-sm font-medium text-kit-ink hover:underline transition-colors"
          >
            <span>Wishlist</span>
            <div className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-kit-ink stroke-[1.75]" />
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-kit-ink text-[11px] font-bold text-white">
                0
              </span>
            </div>
          </Link>

          {/* Sign In CTA or Authenticated User Details */}
          {isAuthenticated ? (
            <div className="pt-2 space-y-2.5">
              <div className="flex items-center gap-2.5 p-2.5 bg-kit-surface rounded-lg">
                <div className="h-8 w-8 rounded-full bg-kit-line flex items-center justify-center text-xs font-bold text-kit-ink">
                  {user?.fullName?.charAt(0) || 'U'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-kit-ink truncate">{user?.fullName}</p>
                  <p className="text-[11px] text-kit-muted truncate">{user?.email}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <Link
                  to="/orders"
                  onClick={onClose}
                  className="flex items-center justify-center gap-1.5 rounded-lg border border-kit-line px-3 py-2.5 text-center text-xs font-semibold text-kit-ink transition-colors hover:bg-kit-surface"
                >
                  <Package className="h-3.5 w-3.5 shrink-0" />
                  <span className="leading-none">Orders</span>
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    logout()
                    onClose()
                  }}
                  className="flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-danger/30 bg-danger-soft px-3 py-2.5 text-center text-xs font-semibold text-danger transition-colors hover:bg-danger/10"
                >
                  <LogOut className="h-3.5 w-3.5 shrink-0" />
                  <span className="leading-none">Sign Out</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="pt-2">
              <Link
                to="/signin"
                onClick={onClose}
                className="w-full py-3.5 px-4 bg-kit-ink hover:bg-black text-white text-sm font-semibold rounded-lg text-center block transition-colors shadow-xs active:scale-98"
              >
                Sign In
              </Link>
            </div>
          )}
        </div>
      </aside>
    </div>
  )
}

export default MobileMenu
