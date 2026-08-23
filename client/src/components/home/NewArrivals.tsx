import React, { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { productService } from '../../lib/services/product.service'
import type { ProductListItem } from '../../lib/types/product'
import { ProductCard } from '../catalog/ProductCard'

export const NewArrivals: React.FC = () => {
  const [products, setProducts] = useState<ProductListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let active = true

    const loadNewArrivals = async () => {
      try {
        const response = await productService.getProducts({
          page: 1,
          limit: 10,
          sort: 'newest',
        })
        if (!response.success) throw new Error(response.error.message)
        if (active) setProducts(response.data)
      } catch (reason) {
        if (active) {
          setError(reason instanceof Error ? reason.message : 'Unable to load new arrivals.')
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    void loadNewArrivals()

    return () => {
      active = false
    }
  }, [])

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -320, behavior: 'smooth' })
    }
  }

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 320, behavior: 'smooth' })
    }
  }

  const displayedProducts = products.slice(0, 5)

  return (
    <section id="new-arrivals" className="editorial-container overflow-hidden py-10 sm:py-14">
      {/* Section Header */}
      <div className="mb-6 flex items-center justify-between gap-4 sm:mb-8">
        <div>
          <span className="eyebrow mb-1.5 block">Just In</span>
          <h2 className="heading text-h2">New Arrivals</h2>
        </div>

        {/* Right Controls: Scroll Buttons & View All */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={scrollLeft}
            className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-[var(--radius-control)] border border-[var(--color-line)] bg-[var(--color-paper)] text-[var(--color-ink)] transition-colors hover:border-[var(--color-ink)] lg:hidden"
            aria-label="Previous new arrivals"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={scrollRight}
            className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-[var(--radius-control)] border border-[var(--color-line)] bg-[var(--color-paper)] text-[var(--color-ink)] transition-colors hover:border-[var(--color-ink)] lg:hidden"
            aria-label="Next new arrivals"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <Link
            to="/shop?sort=newest"
            className="button-secondary min-h-10 shrink-0 px-4 py-2 text-xs"
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

      {!loading && error && <div className="body-copy py-8 text-center text-sm">{error}</div>}

      {!loading && !error && displayedProducts.length === 0 && (
        <div className="body-copy py-8 text-center text-sm">
          New arrivals are being added. Please check back soon.
        </div>
      )}

      {!loading && !error && displayedProducts.length > 0 && (
        <motion.div
          ref={scrollContainerRef}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4 no-scrollbar sm:gap-5 sm:pb-0 lg:grid lg:grid-cols-5 lg:overflow-visible"
        >
          {displayedProducts.map((product) => (
            <div key={product.id} className="w-[240px] shrink-0 snap-start sm:w-[280px] lg:w-auto">
              <ProductCard product={product} badgeText="NEW" />
            </div>
          ))}
        </motion.div>
      )}
    </section>
  )
}

export default NewArrivals
