import React, { useEffect, useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { categoryService } from '../../lib/services/category.service'
import type { Category } from '../../lib/types/category'

const FALLBACK_COLLECTIONS: Category[] = [
  {
    id: 'col-1',
    name: 'Headband',
    slug: 'headband',
    description: 'Premium over-ear headphones and sound gear',
    imageUrl:
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=85',
    sortOrder: 1,
  },
  {
    id: 'col-2',
    name: 'Earbuds',
    slug: 'earbuds',
    description: 'True wireless earbuds with noise cancellation',
    imageUrl:
      'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=600&q=85',
    sortOrder: 2,
  },
  {
    id: 'col-3',
    name: 'Accessories',
    slug: 'accessories',
    description: 'Charging cables, adapters, and gear bags',
    imageUrl:
      'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?auto=format&fit=crop&w=600&q=85',
    sortOrder: 3,
  },
]

export const CategoryGrid: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    const loadCategories = async () => {
      try {
        const response = await categoryService.getCategories()
        if (response.success && active && response.data.length > 0) {
          const sorted = [...response.data].sort((a, b) => a.sortOrder - b.sortOrder)
          setCategories(sorted)
        }
      } catch {
        // Fallback used on error
      } finally {
        if (active) setLoading(false)
      }
    }

    void loadCategories()

    return () => {
      active = false
    }
  }, [])

  const activeCategories =
    categories.length >= 3
      ? categories.slice(0, 3)
      : [
          categories[0] || FALLBACK_COLLECTIONS[0],
          categories[1] || FALLBACK_COLLECTIONS[1],
          categories[2] || FALLBACK_COLLECTIONS[2],
        ]

  const [mainCategory, secondCategory, thirdCategory] = activeCategories

  return (
    <section id="shop-collection" className="editorial-container py-8 sm:py-10">
      {/* Section Header */}
      <div className="mb-5 flex items-center justify-between gap-4 sm:mb-6">
        <div>
          <span className="eyebrow mb-1.5 block">Featured</span>
          <h2 className="text-h2 text-ink">Shop Collection</h2>
        </div>

        {/* View All Categories Link */}
        <Link
          to="/categories"
          className="inline-flex items-center justify-center shrink-0 rounded-[var(--radius-control)] border border-line bg-paper px-3 py-2 text-xs font-normal text-ink transition-colors hover:bg-surface select-none"
        >
          View all categories
        </Link>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2" aria-busy="true">
          <div className="min-h-[340px] animate-pulse rounded-[var(--radius-card)] bg-[var(--color-surface)] sm:min-h-[420px]" />
          <div className="flex flex-col gap-6">
            <div className="min-h-[160px] animate-pulse rounded-[var(--radius-card)] bg-[var(--color-surface)] sm:min-h-[200px]" />
            <div className="min-h-[160px] animate-pulse rounded-[var(--radius-card)] bg-[var(--color-surface)] sm:min-h-[200px]" />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:gap-6 lg:grid-cols-2">
          {/* Left Large Card */}
          <Link
            to={`/category/${mainCategory.slug}`}
            className="group relative flex min-h-[340px] flex-col justify-between overflow-hidden rounded-[var(--radius-card)] bg-[var(--color-surface)] p-5 transition-all sm:min-h-[420px] sm:p-6 lg:min-h-[440px]"
          >
            {/* Center Image */}
            <div className="flex flex-1 items-center justify-center p-4">
              <img
                src={mainCategory.imageUrl}
                alt={mainCategory.name}
                className="max-h-[240px] w-auto max-w-full object-contain transition-transform duration-300 group-hover:scale-105 sm:max-h-[300px]"
                loading="lazy"
              />
            </div>

            {/* Bottom Content */}
            <div className="mt-4">
              <h3 className="text-h3 text-ink">{mainCategory.name}</h3>
              <div className="mt-2 inline-flex items-center gap-1.5 text-body-sm font-normal leading-none text-ink underline underline-offset-4 decoration-line transition-colors group-hover:decoration-ink">
                <span className="leading-none">Collection</span>
                <ArrowRight className="h-3.5 w-3.5 shrink-0 transition-transform duration-200 group-hover:translate-x-1" />
              </div>
            </div>
          </Link>

          {/* Right Column: 2 Stacked Cards */}
          <div className="flex flex-col gap-5 sm:gap-6">
            {/* Top Right Card */}
            <Link
              to={`/category/${secondCategory.slug}`}
              className="group relative flex min-h-[160px] flex-1 items-center justify-between overflow-hidden rounded-[var(--radius-card)] bg-[var(--color-surface)] p-5 transition-all sm:min-h-[200px] sm:p-6"
            >
              <div className="z-10 flex max-w-[55%] flex-col justify-center">
                <h3 className="text-h4 text-ink">{secondCategory.name}</h3>
                <div className="mt-2 inline-flex items-center gap-1.5 text-body-sm font-normal leading-none text-ink underline underline-offset-4 decoration-line transition-colors group-hover:decoration-ink">
                  <span className="leading-none">Collection</span>
                  <ArrowRight className="h-3.5 w-3.5 shrink-0 transition-transform duration-200 group-hover:translate-x-1" />
                </div>
              </div>

              <div className="flex h-full w-[45%] items-center justify-end">
                <img
                  src={secondCategory.imageUrl}
                  alt={secondCategory.name}
                  className="max-h-[140px] w-auto max-w-full object-contain transition-transform duration-300 group-hover:scale-105 sm:max-h-[170px]"
                  loading="lazy"
                />
              </div>
            </Link>

            {/* Bottom Right Card */}
            <Link
              to={`/category/${thirdCategory.slug}`}
              className="group relative flex min-h-[160px] flex-1 items-center justify-between overflow-hidden rounded-[var(--radius-card)] bg-[var(--color-surface)] p-5 transition-all sm:min-h-[200px] sm:p-6"
            >
              <div className="z-10 flex max-w-[55%] flex-col justify-center">
                <h3 className="text-h4 text-ink">{thirdCategory.name}</h3>
                <div className="mt-2 inline-flex items-center gap-1.5 text-body-sm font-normal leading-none text-ink underline underline-offset-4 decoration-line transition-colors group-hover:decoration-ink">
                  <span className="leading-none">Collection</span>
                  <ArrowRight className="h-3.5 w-3.5 shrink-0 transition-transform duration-200 group-hover:translate-x-1" />
                </div>
              </div>

              <div className="flex h-full w-[45%] items-center justify-end">
                <img
                  src={thirdCategory.imageUrl}
                  alt={thirdCategory.name}
                  className="max-h-[140px] w-auto max-w-full object-contain transition-transform duration-300 group-hover:scale-105 sm:max-h-[170px]"
                  loading="lazy"
                />
              </div>
            </Link>
          </div>
        </div>
      )}
    </section>
  )
}

export default CategoryGrid
