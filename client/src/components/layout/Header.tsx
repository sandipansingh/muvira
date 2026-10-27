import React, { useEffect, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { ArrowRight, Menu, Search, ShoppingBag, User, X } from 'lucide-react'
import { useCart } from '../../context/CartContext'
import { useAuth } from '../../context/AuthContext'
import { categoryService } from '../../lib/services/category.service'
import type { Category } from '../../lib/types/category'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Modal } from '../common/Modal'
import { Dropdown } from '../ui/Dropdown'

interface HeaderProps {
  onOpenMobileMenu?: () => void
}

export const Header: React.FC<HeaderProps> = ({ onOpenMobileMenu }) => {
  const { itemCount, openCartDrawer } = useCart()
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [categories, setCategories] = useState<Category[]>([])

  useEffect(() => {
    let active = true
    void categoryService
      .getCategories()
      .then((response) => {
        if (active && response.success)
          setCategories(response.data.sort((a, b) => a.sortOrder - b.sortOrder))
      })
      .catch(() => {
        /* The permanent catalog links remain available. */
      })
    return () => {
      active = false
    }
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
    <>
      <header className={`store-header ${pathname === '/' ? 'store-header--home' : ''}`}>
        <div className="layout-container store-header__main">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={onOpenMobileMenu}
              aria-label="Open navigation menu"
              className="lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <Link to="/" className="brand-lockup" aria-label="Muvira home">
              <img
                src="/logo.png"
                alt=""
                width={659}
                height={723}
                className="brand-mark w-auto object-contain"
              />
              <span className="font-display text-3xl leading-none tracking-tight">Muvira</span>
            </Link>
          </div>
          <nav className="hidden items-center gap-8 text-sm lg:flex" aria-label="Main navigation">
            <NavLink
              to="/shop"
              className={({ isActive }) => `header-link ${isActive ? 'text-primary' : ''}`}
            >
              Shop all
            </NavLink>
            {categories.find((category) => category.slug === 'god-idols') && (
              <Link to="/shop?category=god-idols" className="header-link">
                God Idols
              </Link>
            )}
            <Dropdown
              variant="navigation"
              value=""
              onChange={() => {}}
              placeholder="Collections"
              className="w-auto"
              options={[
                { value: 'all', label: 'All collections', href: '/categories' },
                ...categories.map((category) => ({
                  value: category.id,
                  label: category.name,
                  href: `/shop?category=${encodeURIComponent(category.slug)}`,
                })),
              ]}
            />
            <Link to="/shop?sort=newest" className="header-link">
              New arrivals
            </Link>
          </nav>
          <div className="flex items-center gap-1 sm:gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSearchOpen(true)}
              aria-label="Search products"
            >
              <Search className="h-5 w-5" />
            </Button>
            <Link
              to={isAuthenticated ? '/profile' : '/signin'}
              aria-label={isAuthenticated ? 'My account' : 'Sign in'}
              className="hidden h-11 w-11 items-center justify-center rounded-control hover:bg-surface lg:flex"
            >
              <User className="h-5 w-5" />
            </Link>
            <Button
              variant="ghost"
              size="icon"
              onClick={openCartDrawer}
              className="relative"
              aria-label="Shopping cart"
            >
              <ShoppingBag className="h-5 w-5" />
              {itemCount > 0 && (
                <span className="absolute right-0 top-0 grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-xs text-white">
                  {itemCount}
                </span>
              )}
            </Button>
          </div>
        </div>
      </header>
      <Modal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        title="Find something meaningful"
        maxWidth="lg"
      >
        <form onSubmit={handleSearchSubmit} className="flex flex-wrap items-end gap-3">
          <div className="relative min-w-0 flex-1">
            <label htmlFor="store-search" className="mb-2 block text-sm text-muted">
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
      </Modal>
    </>
  )
}
export default Header
