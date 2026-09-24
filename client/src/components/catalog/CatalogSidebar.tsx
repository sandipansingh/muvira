import React, { useRef, useState } from 'react'
import { Check, RotateCcw, Search, SlidersHorizontal, X } from 'lucide-react'
import { Button } from '../ui/Button'
import { Dropdown } from '../ui/Dropdown'
import { SORT_OPTIONS } from './CatalogTopBar'
import { useDialogFocus } from '../../lib/hooks/useDialogFocus'

export interface PriceRangeOption {
  id: string
  label: string
  min?: number
  max?: number
}

export const PRICE_RANGES: PriceRangeOption[] = [
  { id: 'all', label: 'All Price' },
  { id: '0-999', label: '₹0.00 - 999.00', min: 0, max: 999 },
  { id: '1000-2499', label: '₹1,000.00 - 2,499.00', min: 1000, max: 2499 },
  { id: '2500-4999', label: '₹2,500.00 - 4,999.00', min: 2500, max: 4999 },
  { id: '5000-plus', label: '₹5,000.00+', min: 5000 },
]

export interface CatalogSidebarProps {
  categories: { name: string; slug: string }[]
  selectedCategory: string
  onSelectCategory: (slug: string) => void
  searchQuery?: string
  onSearchChange?: (q: string) => void
  selectedPriceRange?: string
  onSelectPriceRange: (rangeId: string, min?: number, max?: number) => void
  minPrice?: number
  maxPrice?: number
  onCustomPriceChange?: (min?: number, max?: number) => void
  inStockOnly?: boolean
  onToggleInStock?: (inStock: boolean) => void
  onClearFilters: () => void
  isMobileOpen?: boolean
  onMobileClose?: () => void
  sortBy?: string
  onSortChange?: (sort: string) => void
  className?: string
}

export const CatalogSidebar: React.FC<CatalogSidebarProps> = ({
  categories,
  selectedCategory,
  onSelectCategory,
  searchQuery = '',
  onSearchChange,
  selectedPriceRange = 'all',
  onSelectPriceRange,
  minPrice,
  maxPrice,
  onCustomPriceChange,
  inStockOnly = false,
  onToggleInStock,
  onClearFilters,
  isMobileOpen = false,
  onMobileClose,
  sortBy,
  onSortChange,
  className = '',
}) => {
  const [customMin, setCustomMin] = useState(minPrice ? String(minPrice) : '')
  const [customMax, setCustomMax] = useState(maxPrice ? String(maxPrice) : '')
  const panelRef = useRef<HTMLDivElement>(null)

  useDialogFocus(isMobileOpen, () => onMobileClose?.(), panelRef)

  const hasActiveFilters =
    Boolean(searchQuery) ||
    (selectedCategory && selectedCategory !== 'all') ||
    (selectedPriceRange && selectedPriceRange !== 'all') ||
    minPrice !== undefined ||
    maxPrice !== undefined ||
    inStockOnly

  const handleApplyCustomPrice = (e: React.FormEvent) => {
    e.preventDefault()
    const parsedMin = customMin ? Number(customMin) : undefined
    const parsedMax = customMax ? Number(customMax) : undefined
    if (onCustomPriceChange) {
      onCustomPriceChange(parsedMin, parsedMax)
    }
  }

  const sidebarContent = (
    <div className="flex flex-col gap-5 text-ink">
      {/* Header */}
      <div className="flex items-center justify-between pb-1">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-ink" />
          <h2 className="font-sans text-base font-bold text-ink tracking-tight">Filter</h2>
        </div>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={onClearFilters}
            className="flex items-center gap-1 text-xs text-muted hover:text-primary transition-colors cursor-pointer"
          >
            <RotateCcw className="h-3 w-3" />
            <span>Reset</span>
          </button>
        )}
      </div>

      {/* Search Input Box */}
      {onSearchChange && (
        <div className="relative">
          <input
            type="search"
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full rounded-lg border border-field-border bg-white pl-8 pr-7 py-2 text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-0 focus:border-field-border transition-colors [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden"
          />
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted pointer-events-none" />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted hover:text-ink transition-colors cursor-pointer"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Categories Section */}
      <div className="space-y-3">
        <h3 className="font-sans text-xs font-bold uppercase tracking-wider text-muted">
          Categories
        </h3>
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => onSelectCategory('all')}
            className={`block w-full text-left text-sm py-1.5 transition-colors cursor-pointer ${
              selectedCategory === 'all' || !selectedCategory
                ? 'font-bold text-primary underline underline-offset-4 decoration-2 decoration-primary'
                : 'text-muted hover:text-ink'
            }`}
          >
            All Products
          </button>
          {categories.map((category) => {
            const isSelected = selectedCategory === category.slug
            return (
              <button
                key={category.slug}
                type="button"
                onClick={() => onSelectCategory(category.slug)}
                className={`block w-full text-left text-sm py-1.5 transition-colors cursor-pointer ${
                  isSelected
                    ? 'font-bold text-primary underline underline-offset-4 decoration-2 decoration-primary'
                    : 'text-muted hover:text-ink'
                }`}
              >
                {category.name}
              </button>
            )
          })}
        </div>
      </div>

      {/* Price Filter Section */}
      <div className="space-y-3 pt-2 border-t border-line">
        <h3 className="font-sans text-xs font-bold uppercase tracking-wider text-muted">Price</h3>
        <div className="space-y-2">
          {PRICE_RANGES.map((range) => {
            const isChecked = selectedPriceRange === range.id
            return (
              <label
                key={range.id}
                className="flex items-center justify-between gap-3 text-sm cursor-pointer select-none group"
              >
                <span
                  className={`transition-colors ${
                    isChecked ? 'text-primary font-bold' : 'text-muted group-hover:text-ink'
                  }`}
                >
                  {range.label}
                </span>
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={isChecked}
                  onClick={() => onSelectPriceRange(range.id, range.min, range.max)}
                  className={`h-5 w-5 rounded border flex items-center justify-center transition-colors cursor-pointer ${
                    isChecked
                      ? 'bg-primary border-primary text-white'
                      : 'border-field-border bg-white hover:border-primary'
                  }`}
                >
                  {isChecked && <Check className="h-3.5 w-3.5 stroke-[2.5]" />}
                </button>
              </label>
            )
          })}
        </div>

        {/* Custom Price Range Inputs */}
        <form onSubmit={handleApplyCustomPrice} className="pt-2 flex items-center gap-2">
          <input
            type="number"
            placeholder="Min ₹"
            value={customMin}
            onChange={(e) => setCustomMin(e.target.value)}
            className="w-full rounded border border-field-border bg-white px-2.5 py-1.5 text-sm text-ink placeholder:text-muted focus:border-primary outline-none"
            min="0"
          />
          <span className="text-muted text-xs">-</span>
          <input
            type="number"
            placeholder="Max ₹"
            value={customMax}
            onChange={(e) => setCustomMax(e.target.value)}
            className="w-full rounded border border-field-border bg-white px-2.5 py-1.5 text-sm text-ink placeholder:text-muted focus:border-primary outline-none"
            min="0"
          />
          <button
            type="submit"
            className="px-2.5 py-1.5 text-xs font-bold bg-surface hover:bg-line border border-line rounded text-ink transition-colors shrink-0 cursor-pointer"
          >
            Go
          </button>
        </form>
      </div>

      {/* Availability / In Stock Section */}
      {onToggleInStock && (
        <div className="space-y-3 pt-2 border-t border-line">
          <h3 className="font-sans text-xs font-bold uppercase tracking-wider text-muted">
            Availability
          </h3>
          <label className="flex items-center justify-between gap-3 text-sm cursor-pointer select-none group">
            <span
              className={`transition-colors ${
                inStockOnly ? 'text-primary font-bold' : 'text-muted group-hover:text-ink'
              }`}
            >
              In Stock Only
            </span>
            <button
              type="button"
              role="checkbox"
              aria-checked={inStockOnly}
              onClick={() => onToggleInStock(!inStockOnly)}
              className={`h-5 w-5 rounded border flex items-center justify-center transition-colors cursor-pointer ${
                inStockOnly
                  ? 'bg-primary border-primary text-white'
                  : 'border-field-border bg-white hover:border-primary'
              }`}
            >
              {inStockOnly && <Check className="h-3.5 w-3.5 stroke-[2.5]" />}
            </button>
          </label>
        </div>
      )}
    </div>
  )

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className={`hidden lg:block w-full lg:sticky lg:top-24 lg:self-start ${className}`}>
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-[var(--z-drawer)] lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Product filters"
        >
          <button
            type="button"
            onClick={onMobileClose}
            className="absolute inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            aria-label="Close filters"
          />
          <div
            ref={panelRef}
            tabIndex={-1}
            className="absolute inset-y-0 right-0 flex h-screen w-full max-w-sm flex-col overflow-hidden bg-paper pt-[env(safe-area-inset-top)] shadow-2xl"
          >
            <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-line">
                <span className="font-display text-lg text-ink">Filters</span>
                <button
                  type="button"
                  onClick={onMobileClose}
                  className="flex items-center justify-center rounded-md text-muted hover:text-ink transition-colors cursor-pointer"
                  aria-label="Close modal"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              {sortBy && onSortChange && (
                <div className="mb-5">
                  <span className="mb-2 block text-sm font-bold text-ink">Sort by</span>
                  <Dropdown
                    id="mobile-catalog-sort"
                    value={sortBy}
                    onChange={onSortChange}
                    options={SORT_OPTIONS}
                    aria-label="Sort products"
                    className="w-full"
                    menuClassName="w-full"
                  />
                </div>
              )}
              {sidebarContent}
            </div>

            <div className="flex shrink-0 gap-3 border-t border-line bg-paper p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <Button
                variant="secondary"
                size="md"
                onClick={onClearFilters}
                className="flex-1 text-xs"
              >
                Reset
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={onMobileClose}
                className="flex-1 text-xs"
              >
                Show Results
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default CatalogSidebar
