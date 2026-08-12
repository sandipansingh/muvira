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
    <main className="editorial-page py-12 sm:py-16">
      <div className="editorial-container">
        <div className="mb-8">
          <p className="editorial-label">Muvira / Shop</p>
          <h1 className="editorial-heading mt-3 text-display-xl-mobile sm:text-display-xl-desktop">
            {searchQuery ? `Search results for “${searchQuery}”` : 'All collections'}
          </h1>
          <p className="mt-4 max-w-xl text-body text-muted">
            Considered solid wood pieces for the home you are building, one room at a time.
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
          <div className="border-y border-rule py-12 text-center">
            <h2 className="font-display text-heading-m-mobile font-bold text-ink sm:text-heading-m-desktop">
              We could not load the shop
            </h2>
            <p className="mt-2 text-body text-muted">{error}</p>
            <button
              type="button"
              onClick={() => setRefreshToken((value) => value + 1)}
              className="editorial-button mt-6"
            >
              Try again
            </button>
          </div>
        ) : (
          <>
            <ProductGrid products={products} loading={loading} />
            {!loading && totalPages > 1 && (
              <nav
                className="mt-12 flex items-center justify-center gap-4 border-t border-rule pt-6"
                aria-label="Product pages"
              >
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => updateParams({ page: String(page - 1) })}
                  className="text-ui font-semibold text-ink underline decoration-rule underline-offset-4 transition-colors duration-control hover:text-terracotta hover:decoration-terracotta disabled:cursor-not-allowed disabled:no-underline disabled:opacity-40"
                >
                  Previous
                </button>
                <span className="text-ui font-semibold text-muted" aria-current="page">
                  Page {page} of {totalPages}
                </span>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => updateParams({ page: String(page + 1) })}
                  className="text-ui font-semibold text-ink underline decoration-rule underline-offset-4 transition-colors duration-control hover:text-terracotta hover:decoration-terracotta disabled:cursor-not-allowed disabled:no-underline disabled:opacity-40"
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
