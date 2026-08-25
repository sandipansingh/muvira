import React, { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { categoryService } from '../lib/services/category.service'
import { productService } from '../lib/services/product.service'
import type { Category } from '../lib/types/category'
import type { ProductListItem } from '../lib/types/product'
import { FilterBar } from '../components/catalog/FilterBar'
import { ProductGrid } from '../components/catalog/ProductGrid'
import { Breadcrumbs, type BreadcrumbItem } from '../components/common/Breadcrumbs'
import { Pagination } from '../components/common/Pagination'

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
  const resultsContainerRef = useRef<HTMLDivElement>(null)
  const shouldScrollRef = useRef(false)

  useEffect(() => {
    if (shouldScrollRef.current) {
      shouldScrollRef.current = false
      resultsContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [page])

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

  const handlePageChange = (newPage: number) => {
    shouldScrollRef.current = true
    updateParams({ page: String(newPage) })
  }

  const breadcrumbs: BreadcrumbItem[] = [
    { label: 'Home', href: '/' },
    ...(categoryParam && categoryParam !== 'all'
      ? [
          { label: 'Shop', href: '/shop' },
          {
            label:
              categories.find((category) => category.slug === categoryParam)?.name || categoryParam,
          },
        ]
      : searchQuery
        ? [{ label: 'Shop', href: '/shop' }, { label: `Search: "${searchQuery}"` }]
        : [{ label: 'Shop' }]),
  ]

  return (
    <main className="editorial-page py-8 sm:py-10">
      <div className="editorial-container">
        <header className="page-header mb-6">
          <Breadcrumbs items={breadcrumbs} />
          <span className="eyebrow">Muvira / Catalog</span>
          <div className="flex flex-col gap-2">
            <h1 className="heading page-title">
              {searchQuery ? `Search Results for “${searchQuery}”` : 'Explore All Collections'}
            </h1>
            <p className="body-copy max-w-2xl">
              Considered solid wood furniture handcrafted for the home you are building, one room at
              a time.
            </p>
          </div>
        </header>

        <div className="mb-6 grid min-h-32 items-center overflow-hidden rounded-[var(--radius-card)] bg-[var(--color-surface)] px-5 py-6 sm:px-7 lg:grid-cols-[1fr_16rem]">
          <div>
            <p className="eyebrow mb-2">Made for daily living</p>
            <p className="max-w-xl font-display text-xl font-normal tracking-tight text-[var(--color-ink)] sm:text-2xl">
              Pieces that make a room feel considered.
            </p>
          </div>
          {categories[0]?.imageUrl ? (
            <img
              src={categories[0].imageUrl}
              alt="Muvira furniture collection"
              className="hidden h-32 w-full rounded-[var(--radius-card)] object-cover lg:block"
            />
          ) : null}
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
          <div className="border-y border-line py-10 text-center">
            <h2 className="font-display text-2xl font-normal text-ink">
              We could not load the catalog
            </h2>
            <p className="mt-2 text-sm text-muted">{error}</p>
            <button
              type="button"
              onClick={() => setRefreshToken((value) => value + 1)}
              className="button-primary mt-4"
            >
              Try Again
            </button>
          </div>
        ) : (
          <div ref={resultsContainerRef} className="scroll-mt-24">
            <ProductGrid products={products} loading={loading} />
            {!loading && totalPages > 1 && (
              <div className="mt-12 border-t border-[var(--color-line)] pt-8">
                <Pagination
                  currentPage={page}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  )
}

export default ShopPage
