import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { productService } from '../../lib/services/product.service'
import type { ProductListItem } from '../../lib/types/product'
import { ProductCard } from '../catalog/ProductCard'

export const BestSellers: React.FC = () => {
  const [products, setProducts] = useState<ProductListItem[]>([])
  const [selectedFilter, setSelectedFilter] = useState('All')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    const loadBestSellers = async () => {
      try {
        const response = await productService.getProducts({ page: 1, limit: 8, sort: 'popularity' })
        if (!response.success) throw new Error(response.error.message)
        if (active) setProducts(response.data)
      } catch (reason) {
        if (active) setError(reason instanceof Error ? reason.message : 'Unable to load products.')
      } finally {
        if (active) setLoading(false)
      }
    }
    void loadBestSellers()
    return () => {
      active = false
    }
  }, [])

  const filterOptions = useMemo(() => {
    const categories = products
      .map((product) => product.categoryName)
      .filter((name): name is string => Boolean(name))
    return ['All', ...Array.from(new Set(categories))]
  }, [products])

  const filteredProducts = products.filter(
    (product) => selectedFilter === 'All' || product.categoryName === selectedFilter
  )

  return (
    <section className="bg-paper py-12 sm:py-16">
      <div className="editorial-container">
        <div className="flex items-end justify-between gap-6">
          <div>
            <span className="editorial-label">Featured pieces</span>
            <h2 className="editorial-heading mt-2 text-heading-m-mobile sm:text-heading-m-desktop">
              Furniture for the way you live
            </h2>
          </div>

          <Link to="/shop" className="editorial-link shrink-0 text-ui">
            View all products
          </Link>
        </div>

        {!loading && filterOptions.length > 1 && (
          <div className="no-scrollbar mt-6 flex gap-2 overflow-x-auto pb-1">
            {filterOptions.map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setSelectedFilter(filter)}
                className={`shrink-0 rounded-pill border px-4 py-2 text-ui font-semibold transition-colors duration-control ${
                  selectedFilter === filter
                    ? 'border-ink bg-ink text-paper'
                    : 'border-rule bg-paper text-ink hover:border-ink'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        )}

        {loading && (
          <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-6">
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className="aspect-square animate-pulse bg-surface" />
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="mt-8 border-y border-rule py-6 text-body text-muted">{error}</div>
        )}

        {!loading && !error && filteredProducts.length === 0 && (
          <div className="mt-8 border-y border-rule py-6 text-body text-muted">
            Best sellers are being updated. Please check back soon.
          </div>
        )}

        {!loading && !error && filteredProducts.length > 0 && (
          <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-6">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
