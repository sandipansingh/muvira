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

  const visibleCategories = categories.slice(0, 4)

  return (
    <section className="py-space-12 md:py-space-16">
      <div className="editorial-container">
        <div className="mb-space-8 flex items-end justify-between gap-space-4">
          <h2 className="editorial-heading text-heading-m-mobile lg:text-heading-m-desktop">
            Shop by category
          </h2>
          <Link to="/shop" className="editorial-link inline-flex items-center gap-space-2 text-ui">
            View all
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>

        {loading && (
          <div className="flex gap-space-4 overflow-hidden lg:grid lg:grid-cols-4" aria-busy="true">
            {[1, 2, 3, 4].map((item) => (
              <div
                key={item}
                className="aspect-[4/3] basis-4/5 shrink-0 animate-pulse bg-surface lg:basis-auto"
              />
            ))}
          </div>
        )}

        {!loading && error && <p className="text-body text-muted">{error}</p>}

        {!loading && !error && visibleCategories.length === 0 && (
          <p className="text-body text-muted">
            Collections are being updated. Please check back soon.
          </p>
        )}

        {!loading && !error && visibleCategories.length > 0 && (
          <div className="no-scrollbar flex snap-x snap-mandatory gap-space-4 overflow-x-auto pb-space-2 lg:grid lg:grid-cols-4 lg:overflow-visible lg:pb-0">
            {visibleCategories.map((category) => (
              <Link
                key={category.id}
                to={`/shop?category=${category.slug}`}
                className="group basis-4/5 shrink-0 snap-start lg:basis-auto"
              >
                <div className="aspect-[4/3] overflow-hidden rounded-image bg-surface">
                  <img
                    src={category.imageUrl}
                    alt={category.name}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="mt-space-3">
                  <h3 className="text-body font-semibold text-ink transition-colors duration-control group-hover:text-terracotta">
                    {category.name}
                  </h3>
                  {category.itemCount !== undefined && (
                    <p className="mt-space-1 text-ui text-muted">
                      {category.itemCount} {category.itemCount === 1 ? 'product' : 'products'}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
