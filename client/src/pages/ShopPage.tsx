import React, { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { categoryService } from '../lib/services/category.service'
import { productService } from '../lib/services/product.service'
import type { Category } from '../lib/types/category'
import type { ProductListItem } from '../lib/types/product'
import { FilterBar } from '../components/catalog/FilterBar'
import { ProductGrid } from '../components/catalog/ProductGrid'

const PAGE_SIZE = 12

export const ShopPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const [categories, setCategories] = useState<Category[]>([])
  const [products, setProducts] = useState<ProductListItem[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [categoriesLoading, setCategoriesLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshToken, setRefreshToken] = useState(0)
  const categoryParam = searchParams.get('category') || 'all'
  const searchQuery = searchParams.get('q') || ''
  const requestedSort = searchParams.get('sort')
  const sortBy = ['price_asc', 'price_desc', 'newest', 'popularity'].includes(requestedSort ?? '')
    ? requestedSort!
    : 'newest'
  const requestedPage = Number(searchParams.get('page') || '1')
  const page = Number.isFinite(requestedPage) ? Math.max(1, requestedPage) : 1

  useEffect(() => {
    let active = true
    const loadCategories = async () => {
      try {
        const response = await categoryService.getCategories()
        if (!response.success) throw new Error(response.error.message)
        if (active) setCategories(response.data.sort((a, b) => a.sortOrder - b.sortOrder))
      } catch {
        if (active) setCategories([])
      } finally {
        if (active) setCategoriesLoading(false)
      }
    }
    void loadCategories()
    return () => {
      active = false
    }
  }, [])

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
  }, [categoryParam, page, refreshToken, searchQuery, sortBy])

  const updateParams = (changes: Record<string, string | undefined>) => {
    const next = new URLSearchParams(searchParams)
    Object.entries(changes).forEach(([key, value]) => {
      if (value === undefined || value === '') next.delete(key)
      else next.set(key, value)
    })
    setSearchParams(next)
  }

  return (
    <main className="editorial-page py-10 sm:py-16">
      <div className="layout-container">
        <div className="mb-8 max-w-3xl">
          <span className="text-xs font-bold uppercase tracking-widest text-neutral-400 mb-2 block">
            Muvira / Catalog
          </span>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground tracking-tight leading-[1.1] font-display">
            {searchQuery ? `Search Results for “${searchQuery}”` : 'Explore All Collections'}
          </h1>
          <p className="mt-3 text-sm sm:text-base text-neutral-500 font-normal leading-relaxed">
            Considered solid wood furniture handcrafted for the home you are building, one room at a
            time.
          </p>
        </div>

        {!categoriesLoading && (
          <FilterBar
            categories={categories.map(({ name, slug }) => ({ name, slug }))}
            selectedCategory={categoryParam}
            onSelectCategory={(slug) =>
              updateParams({ category: slug === 'all' ? undefined : slug, page: undefined })
            }
            sortBy={sortBy}
            onSortChange={(sort) => updateParams({ sort, page: undefined })}
            totalCount={totalCount}
          />
        )}

        {error ? (
          <div className="border-y border-border-light py-16 text-center">
            <h2 className="font-display text-2xl font-bold text-foreground">
              We could not load the catalog
            </h2>
            <p className="mt-2 text-sm text-neutral-500">{error}</p>
            <button
              type="button"
              onClick={() => setRefreshToken((value) => value + 1)}
              className="editorial-button mt-6"
            >
              Try Again
            </button>
          </div>
        ) : (
          <>
            <ProductGrid products={products} loading={loading} />
            {!loading && totalPages > 1 && (
              <nav
                className="mt-12 flex items-center justify-center gap-4 border-t border-border-light pt-8"
                aria-label="Product pages"
              >
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => updateParams({ page: String(page - 1) })}
                  className="text-xs sm:text-sm font-bold text-foreground underline decoration-border-light underline-offset-4 transition-colors hover:text-brand hover:decoration-brand disabled:cursor-not-allowed disabled:no-underline disabled:opacity-40"
                >
                  Previous
                </button>
                <span
                  className="text-xs sm:text-sm font-semibold text-neutral-500"
                  aria-current="page"
                >
                  Page {page} of {totalPages}
                </span>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => updateParams({ page: String(page + 1) })}
                  className="text-xs sm:text-sm font-bold text-foreground underline decoration-border-light underline-offset-4 transition-colors hover:text-brand hover:decoration-brand disabled:cursor-not-allowed disabled:no-underline disabled:opacity-40"
                >
                  Next
                </button>
              </nav>
            )}
          </>
        )}
      </div>
    </main>
  )
}

export default ShopPage
