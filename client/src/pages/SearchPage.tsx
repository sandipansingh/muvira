import React, { useEffect, useRef, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { Search, X, Sparkles } from 'lucide-react'
import { categoryService } from '../lib/services/category.service'
import { productService } from '../lib/services/product.service'
import type { Category } from '../lib/types/category'
import type { ProductListItem } from '../lib/types/product'
import { ShopHero } from '../components/catalog/ShopHero'
import { CatalogSidebar } from '../components/catalog/CatalogSidebar'
import { CatalogTopBar, type GridViewMode } from '../components/catalog/CatalogTopBar'
import { ProductGrid } from '../components/catalog/ProductGrid'
import { Pagination } from '../components/common/Pagination'

const PAGE_SIZE = 12

export const SearchPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const searchQuery = searchParams.get('q') || ''
  const [localInput, setLocalInput] = useState(searchQuery)

  const [categories, setCategories] = useState<Category[]>([])
  const [products, setProducts] = useState<ProductListItem[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false)
  const [viewMode, setViewMode] = useState<GridViewMode>('grid-3')

  // URL state parameters
  const categoryParam = searchParams.get('category') || 'all'
  const requestedSort = searchParams.get('sort')
  const sortBy = ['price_asc', 'price_desc', 'newest', 'popularity'].includes(requestedSort ?? '')
    ? requestedSort!
    : 'newest'
  const requestedPage = Number(searchParams.get('page') || '1')
  const page = Number.isFinite(requestedPage) ? Math.max(1, requestedPage) : 1
  const minPriceParam = searchParams.get('minPrice')
  const maxPriceParam = searchParams.get('maxPrice')
  const minPrice = minPriceParam ? Number(minPriceParam) : undefined
  const maxPrice = maxPriceParam ? Number(maxPriceParam) : undefined
  const priceRangeParam = searchParams.get('priceRange') || 'all'
  const inStockParam = searchParams.get('inStock') === 'true'

  const resultsContainerRef = useRef<HTMLDivElement>(null)
  const shouldScrollRef = useRef(false)

  // Keep local search input synced with URL
  useEffect(() => {
    setLocalInput(searchQuery)
  }, [searchQuery])

  // Scroll to top of results on page change
  useEffect(() => {
    if (shouldScrollRef.current) {
      shouldScrollRef.current = false
      resultsContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [page])

  // Load categories
  useEffect(() => {
    let active = true
    const loadCategories = async () => {
      try {
        const response = await categoryService.getCategories()
        if (response.success && active) {
          setCategories(response.data.sort((a, b) => a.sortOrder - b.sortOrder))
        }
      } catch {
        if (active) setCategories([])
      }
    }
    void loadCategories()
    return () => {
      active = false
    }
  }, [])

  // Load search products
  useEffect(() => {
    let active = true
    const loadProducts = async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await productService.getProducts({
          q: searchQuery || undefined,
          category: categoryParam === 'all' ? undefined : categoryParam,
          page,
          limit: PAGE_SIZE,
          sort: sortBy as 'price_asc' | 'price_desc' | 'newest' | 'popularity',
          minPrice,
          maxPrice,
          inStock: inStockParam || undefined,
        })
        if (!response.success) throw new Error(response.error.message)
        if (active) {
          setProducts(response.data)
          setTotalCount(response.pagination.total)
          setTotalPages(response.pagination.totalPages)
        }
      } catch (reason) {
        if (active) {
          setProducts([])
          setTotalCount(0)
          setTotalPages(1)
          setError(reason instanceof Error ? reason.message : 'Unable to search products.')
        }
      } finally {
        if (active) setLoading(false)
      }
    }
    void loadProducts()
    return () => {
      active = false
    }
  }, [categoryParam, inStockParam, maxPrice, minPrice, page, searchQuery, sortBy])

  const updateParams = (changes: Record<string, string | undefined>) => {
    const next = new URLSearchParams(searchParams)
    Object.entries(changes).forEach(([key, value]) => {
      if (value === undefined || value === '') next.delete(key)
      else next.set(key, value)
    })
    setSearchParams(next)
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = localInput.trim()
    updateParams({
      q: trimmed || undefined,
      page: undefined,
    })
  }

  const handleClearSearch = () => {
    setLocalInput('')
    updateParams({ q: undefined, page: undefined })
  }

  const handleSelectCategory = (slug: string) => {
    updateParams({
      category: slug === 'all' ? undefined : slug,
      page: undefined,
    })
  }

  const handleSelectPriceRange = (rangeId: string, min?: number, max?: number) => {
    updateParams({
      priceRange: rangeId === 'all' ? undefined : rangeId,
      minPrice: min !== undefined ? String(min) : undefined,
      maxPrice: max !== undefined ? String(max) : undefined,
      page: undefined,
    })
  }

  const handleCustomPriceChange = (min?: number, max?: number) => {
    updateParams({
      priceRange: undefined,
      minPrice: min !== undefined ? String(min) : undefined,
      maxPrice: max !== undefined ? String(max) : undefined,
      page: undefined,
    })
  }

  const handleToggleInStock = (inStock: boolean) => {
    updateParams({
      inStock: inStock ? 'true' : undefined,
      page: undefined,
    })
  }

  const handleClearFilters = () => {
    const next = new URLSearchParams()
    if (searchQuery) next.set('q', searchQuery)
    setSearchParams(next)
  }

  const handlePageChange = (newPage: number) => {
    shouldScrollRef.current = true
    updateParams({ page: String(newPage) })
  }

  const heroTitle = searchQuery ? `Search: “${searchQuery}”` : 'Search Catalog'
  const heroSubtitle = searchQuery
    ? `Showing catalog pieces matching your search term.`
    : 'Search the current product catalog.'

  const activeFiltersCount =
    (categoryParam !== 'all' ? 1 : 0) +
    (priceRangeParam !== 'all' || minPrice !== undefined || maxPrice !== undefined ? 1 : 0) +
    (inStockParam ? 1 : 0)

  return (
    <main className="min-h-screen pb-16 bg-paper">
      {/* Search Hero Banner */}
      <ShopHero
        title={heroTitle}
        subtitle={heroSubtitle}
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Search', href: '/search' },
          ...(searchQuery ? [{ label: `“${searchQuery}”` }] : []),
        ]}
      />

      {/* Prominent Live Search Bar */}
      <div className="layout-container mb-8">
        <form
          onSubmit={handleSearchSubmit}
          className="relative max-w-xl mx-auto flex items-center shadow-xs rounded-xl border border-field-border bg-white p-1.5 transition-colors"
        >
          <div className="pl-3 pr-2 text-muted">
            <Search className="h-5 w-5" />
          </div>
          <input
            type="search"
            placeholder="Search for idols, decor, showpieces, wooden furniture..."
            value={localInput}
            onChange={(e) => setLocalInput(e.target.value)}
            className="w-full bg-transparent text-sm text-ink placeholder:text-muted outline-none py-1.5 [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden"
          />
          {localInput && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="p-1.5 text-muted hover:text-ink transition-colors cursor-pointer"
              aria-label="Clear search query"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <button
            type="submit"
            className="ml-2 rounded-lg bg-primary hover:bg-primary-hover text-white px-4 py-2 text-xs font-bold transition-colors shrink-0 cursor-pointer"
          >
            Search
          </button>
        </form>
      </div>

      {/* Main 2-Column Search Container */}
      <div className="layout-container" ref={resultsContainerRef}>
        <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] xl:grid-cols-[260px_1fr] gap-8 xl:gap-12 items-start">
          {/* Left Sidebar */}
          <CatalogSidebar
            categories={categories.map(({ name, slug }) => ({ name, slug }))}
            selectedCategory={categoryParam}
            onSelectCategory={handleSelectCategory}
            selectedPriceRange={priceRangeParam}
            onSelectPriceRange={handleSelectPriceRange}
            minPrice={minPrice}
            maxPrice={maxPrice}
            onCustomPriceChange={handleCustomPriceChange}
            inStockOnly={inStockParam}
            onToggleInStock={handleToggleInStock}
            onClearFilters={handleClearFilters}
            isMobileOpen={isMobileFiltersOpen}
            onMobileClose={() => setIsMobileFiltersOpen(false)}
          />

          {/* Right Content Area */}
          <div className="w-full">
            <CatalogTopBar
              title={searchQuery ? `Results for “${searchQuery}”` : 'All Products'}
              totalCount={totalCount}
              sortBy={sortBy}
              onSortChange={(sort) => updateParams({ sort, page: undefined })}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              onOpenMobileFilters={() => setIsMobileFiltersOpen(true)}
              activeFiltersCount={activeFiltersCount}
            />

            {error ? (
              <div className="py-16 text-center px-4">
                <h3 className="font-display text-2xl font-semibold text-ink">
                  Unable to load search results
                </h3>
                <p className="mt-2 text-sm text-muted font-normal">{error}</p>
                <button
                  type="button"
                  onClick={() => updateParams({})}
                  className="mt-6 rounded-lg bg-primary hover:bg-primary-hover text-white px-5 py-2.5 text-xs font-normal transition-colors cursor-pointer"
                >
                  Try Again
                </button>
              </div>
            ) : !loading && products.length === 0 ? (
              <div className="py-16 sm:py-24 px-4 text-center flex flex-col items-center justify-center">
                <div className="h-12 w-12 rounded-full bg-surface flex items-center justify-center text-muted mb-4">
                  <Sparkles className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-display text-2xl font-semibold text-ink">
                  {searchQuery ? `No results found for “${searchQuery}”` : 'Search our catalog'}
                </h3>
                <p className="mt-2 text-sm text-muted max-w-md font-normal">
                  Try checking your spelling, using more general keywords, or exploring our popular
                  categories below.
                </p>

                {categories.length > 0 && (
                  <div className="mt-6 flex flex-wrap items-center justify-center gap-2 max-w-md">
                    {categories.slice(0, 5).map((cat) => (
                      <Link
                        key={cat.id}
                        to={`/category/${cat.slug}`}
                        className="h-8 px-3.5 inline-flex items-center justify-center rounded-[var(--radius-control)] border border-line bg-paper text-xs text-ink-soft hover:text-primary hover:border-primary transition-colors select-none"
                      >
                        {cat.name}
                      </Link>
                    ))}
                  </div>
                )}

                <div className="mt-8">
                  <Link
                    to="/shop"
                    className="inline-block rounded-lg bg-primary hover:bg-primary-hover text-white px-5 py-2.5 text-xs font-normal transition-colors"
                  >
                    View All Products
                  </Link>
                </div>
              </div>
            ) : (
              <>
                <ProductGrid
                  products={products}
                  loading={loading}
                  viewMode={viewMode}
                  onResetFilters={handleClearFilters}
                />

                {!loading && totalPages > 1 && (
                  <div className="mt-12 pt-8 border-t border-line">
                    <Pagination
                      currentPage={page}
                      totalPages={totalPages}
                      onPageChange={handlePageChange}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}

export default SearchPage
