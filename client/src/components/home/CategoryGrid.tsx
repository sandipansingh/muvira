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
    <section className="py-8 sm:py-14 layout-container overflow-hidden">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6 sm:mb-10">
        <div>
          <span className="text-h7 text-neutral-400 mb-1.5 block">
            Catalogs
          </span>
          <h2 className="text-h2 text-theme-dark font-display tracking-tight">
            Fresh arrivals and new selections.
          </h2>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            type="button"
            onClick={scrollLeft}
            className="w-9 h-9 rounded-full border border-neutral-200 bg-white hover:bg-neutral-50 text-theme-dark flex items-center justify-center transition-all shadow-xs cursor-pointer active:scale-95"
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={scrollRight}
            className="w-9 h-9 rounded-full border border-neutral-200 bg-white hover:bg-neutral-50 text-theme-dark flex items-center justify-center transition-all shadow-xs cursor-pointer active:scale-95"
            aria-label="Scroll right"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <Link
            to="/shop"
            className="rounded-full border border-neutral-200 bg-white hover:bg-neutral-50 px-4 py-2 text-xs font-semibold text-theme-dark transition-all shadow-xs"
          >
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
              className="aspect-[3/4] w-[260px] sm:w-auto shrink-0 rounded-2xl animate-pulse bg-theme-card"
            />
          ))}
        </div>
      )}

      {!loading && error && <p className="text-sm text-theme-muted">{error}</p>}

      {!loading && !error && visibleCategories.length === 0 && (
        <p className="text-sm text-theme-muted">
          Collections are being updated. Please check back soon.
        </p>
      )}

      {!loading && !error && visibleCategories.length > 0 && (
        <div
          ref={scrollContainerRef}
          className="flex gap-4 sm:gap-6 overflow-x-auto snap-x snap-mandatory no-scrollbar pb-4 sm:pb-0 sm:grid sm:grid-cols-2 lg:grid-cols-4"
        >
          {visibleCategories.map((category) => (
            <Link
              key={category.id}
              to={`/shop?category=${category.slug}`}
              className="group relative w-[260px] sm:w-auto shrink-0 snap-start bg-theme-card rounded-2xl border border-neutral-200/60 overflow-hidden shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between"
            >
              {/* Image Area */}
              <div className="relative aspect-[3/4] overflow-hidden p-3">
                <img
                  src={category.imageUrl}
                  alt={category.name}
                  className="h-full w-full object-cover rounded-xl transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
              </div>

              {/* Title & Action Link */}
              <div className="px-5 pb-5 pt-1 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-base sm:text-lg text-theme-dark leading-snug group-hover:text-brand transition-colors">
                    {category.name}
                  </h3>
                  {category.itemCount !== undefined && (
                    <p className="text-xs text-theme-muted font-medium mt-0.5">
                      {category.itemCount} {category.itemCount === 1 ? 'piece' : 'pieces'}
                    </p>
                  )}
                </div>

                <div className="w-8 h-8 rounded-full bg-white shadow-xs flex items-center justify-center text-theme-dark group-hover:bg-theme-dark group-hover:text-white transition-all duration-300 shrink-0 ml-2">
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}

export default CategoryGrid
