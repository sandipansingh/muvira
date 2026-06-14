import React, { useState, useEffect } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { categoriesApiService } from '../../lib/api/categories'
import { productsApiService } from '../../lib/api/products'
import type { Category } from '../../types/category'
import type { ProductListItem } from '../../types/product'
import ProductCard from '../../components/product/ProductCard'
import ProductFilters from '../../components/product/ProductFilters'
import ProductSort from '../../components/product/ProductSort'
import Pagination from '../../components/ui/Pagination'
import Skeleton from '../../components/ui/Skeleton'
import Breadcrumb from '../../components/layout/Breadcrumb'
import EmptyState from '../../components/shared/EmptyState'
import ErrorState from '../../components/shared/ErrorState'
import Button from '../../components/ui/Button'
import { SlidersHorizontal } from 'lucide-react'

export const CategoryDetail: React.FC = () => {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [category, setCategory] = useState<Category | null>(null)
  const [products, setProducts] = useState<ProductListItem[]>([])
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 12,
    total: 0,
    totalPages: 1,
  })

  const [loadingCategory, setLoadingCategory] = useState(true)
  const [loadingProducts, setLoadingProducts] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showMobileFilters, setShowMobileFilters] = useState(false)

  // Sync inputs with URL params
  const minPrice = searchParams.get('minPrice') || ''
  const maxPrice = searchParams.get('maxPrice') || ''
  const inStock = searchParams.get('inStock') === 'true'
  const sort = searchParams.get('sort') || 'popularity'
  const page = parseInt(searchParams.get('page') || '1', 10)

  useEffect(() => {
    if (slug) {
      fetchCategoryDetails()
    }
  }, [slug])

  useEffect(() => {
    if (slug) {
      fetchCategoryProducts()
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [slug, minPrice, maxPrice, inStock, sort, page])

  const fetchCategoryDetails = async () => {
    setLoadingCategory(true)
    const res = await categoriesApiService.getCategoryBySlug(slug || '')
    if (res.success) {
      setCategory(res.data)
    } else {
      setError(res.error.message || 'Category not found')
    }
    setLoadingCategory(false)
  }

  const fetchCategoryProducts = async () => {
    setLoadingProducts(true)
    const queryParams: any = {
      page,
      limit: 12,
      sort,
      category, // pass category slug
    }

    if (slug) queryParams.category = slug
    if (inStock) queryParams.inStock = inStock

    if (minPrice) queryParams.minPrice = parseFloat(minPrice) * 100
    if (maxPrice) queryParams.maxPrice = parseFloat(maxPrice) * 100

    const res = await productsApiService.getProducts(queryParams)
    if (res.success) {
      setProducts(res.data)
      setPagination(res.pagination)
    } else {
      setError(res.error.message || 'Failed to load products')
    }
    setLoadingProducts(false)
  }

  const updateParam = (key: string, value: string | boolean | number) => {
    const updated = new URLSearchParams(searchParams)

    if (value === '' || value === false || value === undefined || value === null) {
      updated.delete(key)
    } else {
      updated.set(key, value.toString())
    }

    if (key !== 'page') {
      updated.delete('page')
    }

    setSearchParams(updated)
  }

  const handleClearFilters = () => {
    setSearchParams(new URLSearchParams())
  }

  if (error) {
    return (
      <div className="max-w-[1240px] mx-auto px-6 py-8">
        <ErrorState message={error} onRetry={fetchCategoryProducts} />
      </div>
    )
  }

  return (
    <div className="max-w-[1240px] mx-auto px-6 py-6 text-left">
      <Breadcrumb
        items={[
          { label: 'Categories', path: '/categories' },
          { label: category?.name || 'Category' },
        ]}
      />

      {/* Banner/Header */}
      {loadingCategory ? (
        <div className="my-6 space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-full max-w-xl" />
        </div>
      ) : null}

      <div className="flex flex-col md:flex-row gap-6 mt-8">
        {/* Filters */}
        <div className="hidden md:block w-64 shrink-0">
          <ProductFilters
            selectedCategory={slug || ''}
            onCategoryChange={(val) => {
              if (val === '') {
                navigate('/products')
              } else {
                navigate(`/categories/${val}`)
              }
            }}
            minPrice={minPrice}
            maxPrice={maxPrice}
            onPriceChange={(min, max) => {
              updateParam('minPrice', min)
              updateParam('maxPrice', max)
            }}
            inStock={inStock}
            onStockChange={(val) => updateParam('inStock', val)}
            onClear={handleClearFilters}
          />
        </div>

        {/* Mobile controls */}
        <div className="md:hidden flex items-center justify-between w-full bg-transparent p-3.5 rounded-xl">
          <span className="text-xs font-semibold text-secondary600">
            Showing {pagination.total} product
            {pagination.total === 1 ? '' : 's'}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowMobileFilters(!showMobileFilters)}
            className="flex items-center gap-1.5 py-1.5"
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filters
          </Button>
        </div>

        {showMobileFilters && (
          <div className="md:hidden fixed inset-0 z-50 bg-black/50 p-4 flex items-center justify-center">
            <div className="bg-white rounded-xl p-5 max-w-sm w-full max-h-[85vh] overflow-y-auto relative">
              <button
                onClick={() => setShowMobileFilters(false)}
                className="absolute top-4 right-4 text-secondary500 hover:text-darkColor font-bold text-sm"
              >
                Close
              </button>
              <div className="mt-4">
                <ProductFilters
                  selectedCategory={slug || ''}
                  onCategoryChange={(val) => {
                    setShowMobileFilters(false)
                    if (val === '') {
                      navigate('/products')
                    } else {
                      navigate(`/categories/${val}`)
                    }
                  }}
                  minPrice={minPrice}
                  maxPrice={maxPrice}
                  onPriceChange={(min, max) => {
                    updateParam('minPrice', min)
                    updateParam('maxPrice', max)
                    setShowMobileFilters(false)
                  }}
                  inStock={inStock}
                  onStockChange={(val) => {
                    updateParam('inStock', val)
                    setShowMobileFilters(false)
                  }}
                  onClear={() => {
                    handleClearFilters()
                    setShowMobileFilters(false)
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Products list */}
        <div className="flex-grow flex flex-col gap-6">
          <div className="flex items-center justify-between gap-4 border-b border-secondary200 pb-4">
            <div className="hidden md:block">
              <h2 className="text-base md:text-lg font-semibold tracking-wide text-darkColor uppercase">
                Collection Designs
              </h2>
            </div>

            <div className="ml-auto">
              <ProductSort sort={sort} onSortChange={(val) => updateParam('sort', val)} />
            </div>
          </div>

          {loadingProducts ? (
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex flex-col gap-2.5 p-2 bg-transparent rounded-lg">
                  <Skeleton className="aspect-square w-full rounded-md" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-4 w-24" />
                </div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <EmptyState
              title="No products in category"
              description="No designs match the price or availability criteria in this collection."
              actionLabel="Clear Price Filters"
              onAction={handleClearFilters}
            />
          ) : (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {products.map((prod) => (
                  <ProductCard key={prod.id} product={prod} />
                ))}
              </div>

              <Pagination
                page={pagination.page}
                totalPages={pagination.totalPages}
                onPageChange={(pageVal) => updateParam('page', pageVal)}
              />
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default CategoryDetail
