import React, { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { productService } from '../../lib/services/product.service'
import type { ProductListItem } from '../../lib/types/product'
import { SectionHeader } from '../common/SectionHeader'
import { SeeAllLink } from '../common/SeeAllLink'
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
    const unique = ['All', ...Array.from(new Set(categories))]
    return unique.slice(0, 4).map((c) => ({ label: c, value: c }))
  }, [products])

  const filteredProducts = products.filter(
    (product) => selectedFilter === 'All' || product.categoryName === selectedFilter
  )

  const rightSlot = (
    <div className="flex flex-wrap items-center justify-between sm:justify-start gap-3 sm:gap-6 w-full sm:w-auto">
      {filterOptions.length > 1 && (
        <SegmentedControl
          options={filterOptions}
          value={selectedFilter}
          onChange={(v) => setSelectedFilter(v)}
          layoutId="muvira-featured-filter"
        />
      )}
      <SeeAllLink href="/shop" label="See All" />
    </div>
  )

  return (
    <section id="featured-pieces" className="py-gap-section layout-container overflow-hidden">
      <SectionHeader
        title="Explore Featured Pieces"
        subtitle="Heirloom solid wood furniture handcrafted for everyday living"
        rightSlot={rightSlot}
      />

      {loading && (
        <div
          className="flex gap-4 sm:gap-6 overflow-hidden sm:grid sm:grid-cols-2 lg:grid-cols-4"
          aria-busy="true"
        >
          {[1, 2, 3, 4].map((item) => (
            <div
              key={item}
              className="aspect-[4/3] w-[280px] sm:w-auto shrink-0 rounded-[2rem] animate-pulse bg-neutral-100"
            />
          ))}
        </div>
      )}

      {!loading && error && (
        <div className="py-8 text-center text-sm text-neutral-500">{error}</div>
      )}

      {!loading && !error && filteredProducts.length === 0 && (
        <div className="py-8 text-center text-sm text-neutral-500">
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
