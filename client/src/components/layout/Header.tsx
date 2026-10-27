import React, { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  Menu,
  Search,
  ShieldCheck,
  ShoppingBag,
  User,
  X,
} from 'lucide-react'
import { useCart } from '../../context/CartContext'
import { useAuth } from '../../context/AuthContext'
import { useStoreCollections } from '../../context/StoreCollectionsContext'
import { collectionCaption, collectionHref } from '../../lib/utils/collectionPresentation'
import { collectionImage } from '../../lib/utils/collectionImage'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Modal } from '../common/Modal'
import { Dropdown } from '../ui/Dropdown'

interface HeaderProps {
  onOpenMobileMenu?: () => void
  focused?: boolean
}

export const Header: React.FC<HeaderProps> = ({ onOpenMobileMenu, focused = false }) => {
  const { itemCount, openCartDrawer } = useCart()
  const { isAuthenticated } = useAuth()
  const { categories } = useStoreCollections()
  const navigate = useNavigate()
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const headerRef = useRef<HTMLElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const header = headerRef.current
    if (!header) return
    const measure = () =>
      document.documentElement.style.setProperty(
        '--store-header-height',
        `${header.getBoundingClientRect().height}px`
      )
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(header)
    return () => {
      observer.disconnect()
      document.documentElement.style.removeProperty('--store-header-height')
    }
  }, [])

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const query = searchQuery.trim()
    if (!query) {
      event.currentTarget.querySelector<HTMLInputElement>('input[type="search"]')?.focus()
      return
    }
    navigate(`/search?q=${encodeURIComponent(query)}`)
    setIsSearchOpen(false)
  }

  return (
    <>
      <header ref={headerRef} className={`store-header ${focused ? 'store-header--focused' : ''}`}>
        <div className="layout-container store-header__main">
          <div className="store-header__brand">
            {!focused && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onOpenMobileMenu}
                aria-label="Open navigation menu"
                className="store-menu-toggle"
              >
                <Menu className="h-5 w-5" />
              </Button>
            )}
            <Link to="/" className="brand-lockup" aria-label="Muvira home">
              <img
                src="/logo.png"
                alt=""
                width={659}
                height={723}
                className="brand-mark w-auto object-contain"
              />
              <span className="brand-wordmark font-display text-3xl tracking-tight">Muvira</span>
            </Link>
          </div>
          {!focused && (
            <form role="search" onSubmit={handleSearchSubmit} className="header-search">
              <label htmlFor="header-search" className="sr-only">
                Search products and collections
              </label>
              <button
                type="button"
                className="header-search__explore"
                onClick={() => setIsSearchOpen(true)}
                aria-label="Search products"
              >
                <Search className="h-5 w-5" />
              </button>
              <input
                ref={searchRef}
                id="header-search"
                name="q"
                type="search"
                placeholder="Search idols, décor & more…"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
              {searchQuery && (
                <button
                  type="button"
                  className="header-search__clear"
                  aria-label="Clear header search"
                  onClick={() => {
                    setSearchQuery('')
                    searchRef.current?.focus()
                  }}
                >
                  <X className="h-4 w-4" />
                </button>
              )}
              <button
                type="submit"
                className="header-search__submit"
                aria-label="Submit product search"
              >
                <span>Search</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          )}
          {focused ? (
            <div className="focused-header__links">
              <span>
                <ShieldCheck className="h-4 w-4" />
                Your Muvira order
              </span>
              <Link to="/cart">
                <ArrowLeft className="h-4 w-4" />
                Back to bag
              </Link>
            </div>
          ) : (
            <div className="store-header__actions">
              <Link
                to={isAuthenticated ? '/profile' : '/signin'}
                aria-label={isAuthenticated ? 'My account' : 'Sign in'}
                className="header-action"
              >
                <User className="h-5 w-5" />
                <span>{isAuthenticated ? 'Account' : 'Sign in'}</span>
              </Link>
              <button
                type="button"
                onClick={openCartDrawer}
                className="header-action"
                aria-label="Shopping cart"
              >
                <ShoppingBag className="h-5 w-5" />
                <span>Bag</span>
                <span className="header-cart-count">{itemCount}</span>
              </button>
            </div>
          )}
        </div>
        {!focused && (
          <div className="store-header__navigation">
            <nav className="layout-container store-header__nav-inner" aria-label="Main navigation">
              <Dropdown
                variant="navigation"
                navigationLayout="collections"
                value=""
                onChange={() => {}}
                placeholder="All collections"
                aria-label="Collections"
                className="collection-dropdown"
                options={[
                  {
                    value: 'all',
                    label: 'All collections',
                    href: '/categories',
                    description: 'Explore the collection directory',
                  },
                  ...categories.map((category) => ({
                    value: category.id,
                    label: category.name,
                    href: collectionHref(category),
                    imageUrl: collectionImage(category.imageUrl).src,
                    description: collectionCaption(category),
                  })),
                  { value: 'shop', label: 'Shop all products', href: '/shop' },
                  { value: 'new', label: 'New arrivals', href: '/shop?sort=newest' },
                ]}
              />
              <NavLink to="/shop" end className="header-link">
                Shop all
              </NavLink>
              {categories
                .filter((category) => category.showInNavbar)
                .map((category) => (
                  <Link key={category.id} to={collectionHref(category)} className="header-link">
                    {category.name}
                  </Link>
                ))}
              <Link to="/shop?sort=newest" className="header-link">
                New arrivals
              </Link>
            </nav>
          </div>
        )}
      </header>
      <Modal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        title="Find something meaningful"
        maxWidth="lg"
      >
        <form onSubmit={handleSearchSubmit} className="space-y-5">
          <div className="relative">
            <label htmlFor="store-search" className="mb-2 block text-sm text-ink-soft">
              Search the collection
            </label>
            <Input
              id="store-search"
              name="q"
              type="search"
              placeholder="Search idols, puja products…"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              data-dialog-initial-focus
              className="pr-12"
            />
            {searchQuery && (
              <button
                type="button"
                aria-label="Clear search query"
                className="absolute bottom-0 right-0 grid h-11 w-11 place-items-center text-muted hover:text-primary"
                onClick={() => {
                  setSearchQuery('')
                  document.getElementById('store-search')?.focus()
                }}
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <Button type="submit" size="lg" rightIcon={<ArrowRight className="h-4 w-4" />}>
            Search
          </Button>
        </form>
        <div className="mt-6 border-t border-line pt-5">
          <p className="mb-3 text-sm font-semibold">Explore a collection</p>
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <Link
                key={category.id}
                to={collectionHref(category)}
                onClick={() => setIsSearchOpen(false)}
                className="search-collection-link"
              >
                {category.name}
              </Link>
            ))}
          </div>
        </div>
      </Modal>
    </>
  )
}
export default Header
