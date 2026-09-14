import React, { useEffect, useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { categoryService } from '../../lib/services/category.service'
import type { Category } from '../../lib/types/category'

export const CategoryGrid: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    const loadCategories = async () => {
      try {
        const response = await categoryService.getCategories()
        if (!response.success) throw new Error(response.error.message)
        if (active) {
          setCategories([...response.data].sort((a, b) => a.sortOrder - b.sortOrder).slice(0, 3))
        }
      } catch (reason) {
        if (active) {
          setError(reason instanceof Error ? reason.message : 'Unable to load categories.')
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    void loadCategories()
    return () => {
      active = false
    }
  }, [])

  return (
    <section id="shop-collection" className="editorial-container py-8 sm:py-10">
      <div className="mb-5 flex items-center justify-between gap-4 sm:mb-6">
        <div>
          <span className="eyebrow mb-1.5 block">Featured</span>
          <h2 className="text-h2 text-ink">Shop Collection</h2>
        </div>
        <Link
          to="/categories"
          className="inline-flex h-8 shrink-0 select-none items-center justify-center rounded-[var(--radius-control)] border border-line bg-paper px-3.5 text-xs font-normal text-ink transition-colors hover:border-primary hover:bg-surface hover:text-primary"
        >
          View all categories
        </Link>
      </div>

      {loading && (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="aspect-[4/3] animate-pulse rounded-[var(--radius-card)] bg-surface"
            />
          ))}
        </div>
      )}

      {!loading && error && <p className="py-8 text-center text-body-sm text-muted">{error}</p>}

      {!loading && !error && categories.length === 0 && (
        <p className="py-8 text-center text-body-sm text-muted">No categories are available.</p>
      )}

      {!loading && !error && categories.length > 0 && (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <Link
              key={category.id}
              to={`/shop?category=${encodeURIComponent(category.slug)}`}
              className="group flex min-h-[280px] flex-col justify-between overflow-hidden rounded-[var(--radius-card)] bg-surface p-5 sm:p-6"
            >
              <div className="flex flex-1 items-center justify-center p-4">
                {category.imageUrl ? (
                  <img
                    src={category.imageUrl}
                    alt={category.name}
                    className="max-h-[220px] w-auto max-w-full object-contain transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                  />
                ) : (
                  <span className="text-body-sm text-muted">Image unavailable</span>
                )}
              </div>
              <div className="mt-4">
                <h3 className="text-h3 text-ink">{category.name}</h3>
                <span className="mt-2 inline-flex items-center gap-1.5 text-body-sm text-ink underline decoration-line underline-offset-4 transition-colors group-hover:decoration-ink">
                  View collection
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
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
