import React, { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
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

export const ShopPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams()
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
  const searchQuery = searchParams.get('q') || ''
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

  // Load products based on query params
  useEffect(() => {
    let active = true
    const loadProducts = async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await productService.getProducts({
          page,
          limit: PAGE_SIZE,
          q: searchQuery || undefined,
          category: categoryParam === 'all' ? undefined : categoryParam,
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
          setError(reason instanceof Error ? reason.message : 'Unable to load products.')
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

  const handleSelectCategory = (slug: string) => {
    updateParams({
      category: slug === 'all' ? undefined : slug,
      page: undefined,
    })
  }

  const handleSearchChange = (q: string) => {
    updateParams({
      q: q.trim() || undefined,
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
    setSearchParams(new URLSearchParams())
  }

  const handlePageChange = (newPage: number) => {
    shouldScrollRef.current = true
    updateParams({ page: String(newPage) })
  }

  const selectedCategoryObj = categories.find((c) => c.slug === categoryParam)
  const currentTitle = searchQuery
    ? `Results for “${searchQuery}”`
    : categoryParam && categoryParam !== 'all'
      ? selectedCategoryObj?.name || 'Category'
      : 'All Products'

  const activeFiltersCount =
    (searchQuery ? 1 : 0) +
    (categoryParam !== 'all' ? 1 : 0) +
    (priceRangeParam !== 'all' || minPrice !== undefined || maxPrice !== undefined ? 1 : 0) +
    (inStockParam ? 1 : 0)

  return (
    <main className="min-h-screen pb-16 bg-paper">
      {/* Top Rounded Hero Banner */}
      <ShopHero
        title="Shop Page"
        subtitle="Let's design the place you always imagined."
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Shop' }]}
      />

      {/* Main 2-Column Catalog Container */}
      <div className="layout-container" ref={resultsContainerRef}>
        <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] xl:grid-cols-[260px_1fr] gap-8 xl:gap-12 items-start">
          {/* Left Sidebar */}
          <CatalogSidebar
            categories={categories.map(({ name, slug }) => ({ name, slug }))}
            selectedCategory={categoryParam}
            onSelectCategory={handleSelectCategory}
            searchQuery={searchQuery}
            onSearchChange={handleSearchChange}
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
              title={currentTitle}
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
                <h3 className="font-display text-2xl font-normal text-ink">
                  Unable to load products
                </h3>
                <p className="mt-2 text-sm text-muted font-normal">{error}</p>
                <button
                  type="button"
                  onClick={() => updateParams({})}
                  className="mt-6 rounded-lg bg-ink hover:bg-black text-white px-5 py-2.5 text-xs font-normal transition-colors cursor-pointer"
                >
                  Try Again
                </button>
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

export default ShopPage
