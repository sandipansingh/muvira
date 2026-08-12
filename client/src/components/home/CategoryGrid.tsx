import React, { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
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
    <section className="py-8 sm:py-12 layout-container overflow-hidden">
      {/* Section Header (Matches off.vstore Catalogs header) */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6 sm:mb-8">
        <div>
          <span className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1.5">
            Catalogs
          </span>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-neutral-900 font-display">
            Fresh arrivals and new selections.
          </h2>
        </div>

        {/* Right Controls: Arrow buttons + View All pill */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={scrollLeft}
            className="w-8 h-8 rounded-full border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-700 flex items-center justify-center transition-all shadow-xs cursor-pointer active:scale-95"
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={scrollRight}
            className="w-8 h-8 rounded-full border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-700 flex items-center justify-center transition-all shadow-xs cursor-pointer active:scale-95"
            aria-label="Scroll right"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <Link
            to="/shop"
            className="rounded-full border border-neutral-200 bg-white hover:bg-neutral-50 px-4 py-1.5 text-xs font-semibold text-neutral-800 transition-all shadow-xs"
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
              className="aspect-[3/4] w-[260px] sm:w-auto shrink-0 rounded-[2rem] animate-pulse bg-neutral-100"
            />
          ))}
        </div>
      )}

      {!loading && error && <p className="text-sm text-neutral-500">{error}</p>}

      {!loading && !error && visibleCategories.length === 0 && (
        <p className="text-sm text-neutral-500">
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
              className="group relative w-[260px] sm:w-auto shrink-0 snap-start bg-neutral-50/50 rounded-[2rem] border border-neutral-200/80 overflow-hidden shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between"
            >
              {/* Image Area */}
              <div className="relative aspect-[3/4] bg-neutral-100 overflow-hidden rounded-[1.8rem] m-2">
                <img
                  src={category.imageUrl}
                  alt={category.name}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />

                {/* Add Collections + Pill Badge */}
                <div className="absolute top-3 right-3 z-10">
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/90 backdrop-blur-md px-2.5 py-1 text-[10px] font-bold text-neutral-800 shadow-xs border border-white/40 group-hover:bg-white transition-colors select-none">
                    <span>Add collections</span>
                    <Plus className="w-3 h-3 text-neutral-600" />
                  </span>
                </div>
              </div>

              {/* Title & Item Count */}
              <div className="px-5 pb-5 pt-2">
                <h3 className="font-bold text-base text-neutral-900 leading-snug group-hover:text-brand transition-colors">
                  {category.name}
                </h3>
                {category.itemCount !== undefined && (
                  <p className="mt-1 text-xs text-neutral-500 font-medium">
                    {category.itemCount} {category.itemCount === 1 ? 'piece' : 'pieces'}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}

export default CategoryGrid
