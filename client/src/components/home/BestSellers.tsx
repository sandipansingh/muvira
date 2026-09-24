import React, { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { productService } from '../../lib/services/product.service'
import type { ProductListItem } from '../../lib/types/product'
import { SegmentedControl } from '../common/SegmentedControl'
import { ProductCard } from '../catalog/ProductCard'

export const FeaturedProducts: React.FC = () => {
  const [products, setProducts] = useState<ProductListItem[]>([])
  const [selectedFilter, setSelectedFilter] = useState('All')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    const loadFeaturedProducts = async () => {
      try {
        const response = await productService.getProducts({
          page: 1,
          limit: 10,
          sort: 'featured',
        })
        if (!response.success) throw new Error(response.error.message)
        if (active) setProducts(response.data)
      } catch (reason) {
        if (active) setError(reason instanceof Error ? reason.message : 'Unable to load products.')
      } finally {
        if (active) setLoading(false)
      }
    }
    void loadFeaturedProducts()
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
    <section id="featured-pieces" className="editorial-container overflow-hidden py-8 sm:py-10">
      <div className="mb-5 flex flex-col justify-between gap-4 sm:mb-6 lg:flex-row lg:items-end">
        <div>
          <span className="eyebrow mb-1.5 block">Explore</span>
          <h2 className="text-h2 text-ink">Featured Products</h2>
        </div>

        <div className="flex w-full min-w-0 items-center gap-1.5 lg:w-auto">
          {filterOptions.length > 1 && (
            <SegmentedControl
              options={filterOptions}
              value={selectedFilter}
              onChange={(v) => setSelectedFilter(v)}
              layoutId="muvira-featured-filter"
              variant="pill"
              size="sm"
              className="min-w-0 flex-1 lg:flex-none"
            />
          )}
          <Link
            to="/shop?sort=featured"
            className="inline-flex min-h-[var(--tap-target)] shrink-0 select-none items-center justify-center rounded-[var(--radius-control)] border border-line bg-paper px-3.5 text-sm font-normal text-ink transition-colors hover:border-primary hover:bg-surface hover:text-primary"
          >
            View all
          </Link>
        </div>
      </div>

      {loading && (
        <div
          className="flex gap-4 overflow-hidden sm:gap-5 lg:grid lg:grid-cols-5"
          aria-busy="true"
        >
          {[1, 2, 3, 4, 5].map((item) => (
            <div
              key={item}
              className="flex w-[240px] shrink-0 animate-pulse flex-col gap-2 sm:w-[280px] lg:w-auto"
            >
              <div className="aspect-square rounded-[var(--radius-card)] bg-[var(--color-surface)]" />
              <div className="h-3 w-16 rounded bg-[var(--color-line)]" />
              <div className="h-4 w-3/4 rounded bg-[var(--color-line)]" />
              <div className="h-4 w-1/3 rounded bg-[var(--color-line)]" />
            </div>
          ))}
        </div>
      )}

      {!loading && error && <div className="text-body-sm text-muted py-8 text-center">{error}</div>}

      {!loading && !error && filteredProducts.length === 0 && (
        <div className="text-body-sm text-muted py-8 text-center">
          Featured products are being updated. Please check back soon.
        </div>
      )}

      {!loading && !error && filteredProducts.length > 0 && (
        <motion.div
          key={selectedFilter}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4 no-scrollbar sm:gap-5 sm:pb-0 lg:grid lg:grid-cols-5 lg:overflow-visible"
        >
          {filteredProducts.map((product) => (
            <div key={product.id} className="w-[240px] shrink-0 snap-start sm:w-[280px] lg:w-auto">
              <ProductCard product={product} />
            </div>
          ))}
        </motion.div>
      )}
    </section>
  )
}

export default FeaturedProducts
