import React, { useEffect, useMemo, useState } from 'react'
import { ArrowRight } from 'lucide-react'
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
    <section className="bg-ivory py-16 sm:py-20">
      <div className="editorial-container">
        <div className="mb-10 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="editorial-label">Customer favorites</p>
            <h2 className="editorial-heading mt-3 text-4xl sm:text-5xl">Our best sellers</h2>
          </div>
          {!loading && filterOptions.length > 1 && (
            <div className="no-scrollbar flex items-center gap-5 overflow-x-auto">
              {filterOptions.map((filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setSelectedFilter(filter)}
                  className={`shrink-0 border-b pb-2 text-xs font-semibold transition-colors ${selectedFilter === filter ? 'border-ink text-ink' : 'border-transparent text-muted-ink hover:border-line hover:text-ink'}`}
                >
                  {filter}
                </button>
              ))}
            </div>
          )}
        </div>

        {loading && (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className="aspect-square animate-pulse bg-paper" />
            ))}
          </div>
        )}
        {!loading && error && (
          <p className="border border-line bg-paper p-6 text-sm text-muted-ink">{error}</p>
        )}
        {!loading && !error && filteredProducts.length === 0 && (
          <p className="border border-line bg-paper p-6 text-sm text-muted-ink">
            Best sellers are being updated. Please check back soon.
          </p>
        )}
        {!loading && !error && filteredProducts.length > 0 && (
          <div className="grid grid-cols-1 gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}

        <div className="mt-12">
          <Link to="/shop" className="editorial-button-secondary">
            View all products <ArrowRight className="h-4 w-4 text-cognac" />
          </Link>
        </div>
      </div>
    </section>
  )
}
