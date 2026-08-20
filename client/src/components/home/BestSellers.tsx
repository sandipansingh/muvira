import React, { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { productService } from '../../lib/services/product.service'
import type { ProductListItem } from '../../lib/types/product'
import { SegmentedControl } from '../common/SegmentedControl'
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
        const response = await productService.getProducts({
          page: 1,
          limit: 8,
          sort: 'popularity',
        })
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
    const unique = ['All', ...Array.from(new Set(categories))]
    return unique.slice(0, 5).map((c) => ({ label: c, value: c }))
  }, [products])

  const filteredProducts = products.filter(
    (product) => selectedFilter === 'All' || product.categoryName === selectedFilter
  )

  return (
    <section id="featured-pieces" className="editorial-container overflow-hidden py-12 sm:py-16">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6 sm:mb-10">
        <div>
          <span className="kit-eyebrow mb-1.5 block">Featured</span>
          <h2 className="kit-heading text-h2">Our Best Sellers</h2>
        </div>

        {/* Right Controls: Category Pills & View All */}
        <div className="flex items-center gap-3 flex-wrap">
          {filterOptions.length > 1 && (
            <SegmentedControl
              options={filterOptions}
              value={selectedFilter}
              onChange={(v) => setSelectedFilter(v)}
              layoutId="muvira-featured-filter"
              variant="pill"
              size="sm"
            />
          )}
          <Link to="/shop" className="kit-button-secondary min-h-10 shrink-0 px-4 py-2 text-xs">
            View all
          </Link>
        </div>
      </div>

      {loading && (
        <div
          className="flex gap-4 sm:gap-6 overflow-hidden sm:grid sm:grid-cols-2 lg:grid-cols-4"
          aria-busy="true"
        >
          {[1, 2, 3, 4].map((item) => (
            <div
              key={item}
              className="flex w-[280px] shrink-0 animate-pulse flex-col gap-2 sm:w-auto"
            >
              <div className="aspect-[3/4] rounded-[var(--kit-radius-card)] bg-[var(--kit-surface)] sm:aspect-square" />
              <div className="h-3 w-16 rounded bg-[var(--kit-line)]" />
              <div className="h-4 w-3/4 rounded bg-[var(--kit-line)]" />
              <div className="h-4 w-1/3 rounded bg-[var(--kit-line)]" />
            </div>
          ))}
        </div>
      )}

      {!loading && error && <div className="kit-body-copy py-8 text-center text-sm">{error}</div>}

      {!loading && !error && filteredProducts.length === 0 && (
        <div className="kit-body-copy py-8 text-center text-sm">
          Featured pieces are being updated. Please check back soon.
        </div>
      )}

      {!loading && !error && filteredProducts.length > 0 && (
        <motion.div
          key={selectedFilter}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="flex overflow-x-auto gap-4 sm:gap-6 snap-x snap-mandatory no-scrollbar pb-4 sm:pb-0 sm:grid sm:grid-cols-2 lg:grid-cols-4"
        >
          {filteredProducts.map((product) => (
            <div key={product.id} className="w-[280px] sm:w-auto shrink-0 snap-start">
              <ProductCard product={product} />
            </div>
          ))}
        </motion.div>
      )}
    </section>
  )
}

export default BestSellers
