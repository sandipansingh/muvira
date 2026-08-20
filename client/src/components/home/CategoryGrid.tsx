import React, { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react'
import { categoryService } from '../../lib/services/category.service'
import type { Category } from '../../lib/types/category'

export const CategoryGrid: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let active = true

    const loadCategories = async () => {
      try {
        const response = await categoryService.getCategories()
        if (!response.success) throw new Error(response.error.message)
        if (active) setCategories([...response.data].sort((a, b) => a.sortOrder - b.sortOrder))
      } catch (reason) {
        if (active)
          setError(reason instanceof Error ? reason.message : 'Unable to load categories.')
      } finally {
        if (active) setLoading(false)
      }
    }

    void loadCategories()

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

  const visibleCategories = categories.length > 0 ? categories : []

  return (
    <section className="editorial-container overflow-hidden py-10 sm:py-14">
      {/* Section Header */}
      <div className="mb-5 flex flex-col justify-between gap-4 sm:mb-8 sm:flex-row sm:items-end">
        <div>
          <span className="kit-eyebrow mb-1.5 block">Catalogs</span>
          <h2 className="kit-heading text-h2">Fresh arrivals and new selections.</h2>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            type="button"
            onClick={scrollLeft}
            className="flex h-10 w-10 items-center justify-center rounded-[var(--kit-radius-control)] border border-[var(--kit-line)] bg-[var(--kit-paper)] text-[var(--kit-ink)] transition-colors hover:border-[var(--kit-ink)] cursor-pointer"
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={scrollRight}
            className="flex h-10 w-10 items-center justify-center rounded-[var(--kit-radius-control)] border border-[var(--kit-line)] bg-[var(--kit-paper)] text-[var(--kit-ink)] transition-colors hover:border-[var(--kit-ink)] cursor-pointer"
            aria-label="Scroll right"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <Link to="/shop" className="kit-button-secondary min-h-10 px-4 py-2 text-xs">
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
              className="aspect-[4/3] w-[220px] shrink-0 animate-pulse rounded-[var(--kit-radius-card)] bg-[var(--kit-surface)] sm:w-auto"
            />
          ))}
        </div>
      )}

      {!loading && error && <p className="kit-body-copy text-sm">{error}</p>}

      {!loading && !error && visibleCategories.length === 0 && (
        <p className="kit-body-copy text-sm">
          Collections are being updated. Please check back soon.
        </p>
      )}

      {!loading && !error && visibleCategories.length > 0 && (
        <div
          ref={scrollContainerRef}
          className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 no-scrollbar sm:grid sm:grid-cols-2 sm:gap-6 sm:pb-0 lg:grid-cols-4"
        >
          {visibleCategories.map((category) => (
            <Link
              key={category.id}
              to={`/shop?category=${category.slug}`}
              className="group w-[220px] shrink-0 snap-start sm:w-auto"
            >
              {/* Image Area */}
              <div className="relative aspect-[4/3] overflow-hidden rounded-[var(--kit-radius-card)] bg-[var(--kit-surface)]">
                <img
                  src={category.imageUrl}
                  alt={category.name}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.025]"
                  loading="lazy"
                />
              </div>

              {/* Title & Action Link */}
              <div className="flex items-start justify-between gap-4 border-b border-[var(--kit-line)] py-3">
                <div>
                  <h3 className="kit-product-card__name text-sm sm:text-base">{category.name}</h3>
                  {category.itemCount !== undefined && (
                    <p className="kit-product-card__meta mt-1 font-medium">
                      {category.itemCount} {category.itemCount === 1 ? 'piece' : 'pieces'}
                    </p>
                  )}
                </div>

                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[var(--kit-line)] text-[var(--kit-ink)] transition-colors group-hover:border-[var(--kit-ink)] group-hover:bg-[var(--kit-ink)] group-hover:text-[var(--kit-white)]">
                  <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}

export default CategoryGrid
