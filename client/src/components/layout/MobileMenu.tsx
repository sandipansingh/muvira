import React, { useRef, useState } from 'react'
import { ChevronDown, LogOut, Package, Search, ShoppingBag, X } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useCart } from '../../context/CartContext'
import { useDialogFocus } from '../../lib/hooks/useDialogFocus'

interface MobileMenuProps {
  isOpen: boolean
  onClose: () => void
}

const SHOP_CATEGORIES = [
  { label: 'All Products', href: '/shop' },
  { label: 'All Categories', href: '/categories' },
]

const PRODUCT_LINKS = [{ label: 'New Arrivals', href: '/shop?sort=newest' }]

export const MobileMenu: React.FC<MobileMenuProps> = ({ isOpen, onClose }) => {
  const { isAuthenticated, user, logout } = useAuth()
  const { itemCount, openCartDrawer } = useCart()
  const [searchQuery, setSearchQuery] = useState('')
  const [isShopExpanded, setIsShopExpanded] = useState(false)
  const [isProductExpanded, setIsProductExpanded] = useState(false)
  const navigate = useNavigate()
  const panelRef = useRef<HTMLElement>(null)

  useDialogFocus(isOpen, onClose, panelRef)

  if (!isOpen) return null

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const query = searchQuery.trim()
    if (!query) return
    navigate(`/search?q=${encodeURIComponent(query)}`)
    setSearchQuery('')
    onClose()
  }

  const handleOpenCart = () => {
    onClose()
    openCartDrawer()
  }

  return (
    <div
      className="fixed inset-0 z-[var(--z-drawer)] animate-in fade-in duration-200"
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
      <aside
        ref={panelRef}
        tabIndex={-1}
        className="relative flex h-screen w-[min(90vw,24rem)] flex-col justify-between overflow-y-auto border-r border-line bg-paper pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] shadow-2xl"
      >
        <div className="p-4 sm:p-6">
          {/* Header with Brand Logo & Close X */}
          <div className="flex items-center justify-between pb-5">
            <Link to="/" onClick={onClose} className="flex items-center gap-2.5 select-none">
              <img
                src="/logo.png"
                alt="Muvira"
                width="659"
                height="723"
                className="brand-mark w-auto object-contain shrink-0"
              />
              <span className="translate-y-[2px] font-display text-xl tracking-tight text-ink leading-none">
                Muvira
              </span>
            </Link>
            <button
              type="button"
              onClick={onClose}
              className="flex items-center justify-center text-ink hover:bg-surface rounded-[var(--radius-control)] transition-colors cursor-pointer"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Search Box Enclosure (Reference Style) */}
          <form onSubmit={handleSearchSubmit} className="my-3">
            <div className="flex items-center gap-2.5 rounded-lg border border-field-border bg-white px-3.5 py-2.5">
              <Search className="h-5 w-5 text-muted shrink-0" />
              <input
                type="search"
                placeholder="Search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="min-w-0 w-full bg-transparent text-base text-ink placeholder:text-muted outline-none [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden"
              />
            </div>
          </form>

          {/* Main Navigation List */}
          <nav className="mt-4 divide-y divide-line">
            {/* Home */}
            <div>
              <Link
                to="/"
                onClick={onClose}
                className="flex min-h-[var(--tap-target)] items-center text-base font-normal text-ink hover:underline transition-colors"
              >
                Home
              </Link>
            </div>

            {/* Shop (with Dropdown) */}
            <div>
              <button
                type="button"
                onClick={() => setIsShopExpanded((prev) => !prev)}
                className="flex items-center justify-between w-full text-base font-normal text-ink hover:underline transition-colors cursor-pointer"
              >
                <span>Shop</span>
                <ChevronDown
                  className={`h-4 w-4 text-muted transition-transform duration-200 ${
                    isShopExpanded ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {isShopExpanded && (
                <div className="mt-2 pl-3 space-y-2 border-l border-line">
                  {SHOP_CATEGORIES.map((category) => (
                    <Link
                      key={category.label}
                      to={category.href}
                      onClick={onClose}
                      className="flex min-h-[var(--tap-target)] items-center text-sm font-normal text-muted hover:text-ink transition-colors"
                    >
                      {category.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Product (with Dropdown) */}
            <div>
              <button
                type="button"
                onClick={() => setIsProductExpanded((prev) => !prev)}
                className="flex items-center justify-between w-full text-base font-normal text-ink hover:underline transition-colors cursor-pointer"
              >
                <span>Product</span>
                <ChevronDown
                  className={`h-4 w-4 text-muted transition-transform duration-200 ${
                    isProductExpanded ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {isProductExpanded && (
                <div className="mt-2 pl-3 space-y-2 border-l border-line">
                  {PRODUCT_LINKS.map((link) => (
                    <Link
                      key={link.label}
                      to={link.href}
                      onClick={onClose}
                      className="flex min-h-[var(--tap-target)] items-center text-sm font-normal text-muted hover:text-ink transition-colors"
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </nav>
        </div>

        {/* Bottom actions */}
        <div className="border-t border-line p-4 space-y-4 sm:p-6">
          {/* Cart Row with Bag Icon & Counter */}
          <button
            type="button"
            onClick={handleOpenCart}
            className="flex items-center justify-between w-full py-1 text-sm font-normal text-ink hover:underline transition-colors cursor-pointer"
          >
            <span>Cart</span>
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-ink stroke-[1.75]" />
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[11px] font-normal text-white">
                {itemCount}
              </span>
            </div>
          </button>

          {/* Sign In CTA or Authenticated User Details */}
          {isAuthenticated ? (
            <div className="pt-2 space-y-2.5">
              <div className="flex items-center gap-2.5 p-2.5 bg-surface rounded-lg">
                <div className="h-8 w-8 rounded-full bg-line flex items-center justify-center text-xs font-normal text-ink">
                  {user?.fullName?.charAt(0) || 'U'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-normal text-ink truncate">{user?.fullName}</p>
                  <p className="text-[11px] text-muted truncate">{user?.email}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <Link
                  to="/orders"
                  onClick={onClose}
                  className="flex items-center justify-center gap-1.5 rounded-lg border border-line px-3 py-2.5 text-center text-xs font-normal text-ink transition-colors hover:bg-surface"
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
                  className="flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-line bg-paper px-3 py-2.5 text-center text-xs font-normal text-danger transition-colors hover:bg-danger-soft"
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
                className="button-primary w-full py-3.5 text-sm rounded-lg text-center block shadow-xs active:scale-98"
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
