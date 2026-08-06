import React, { useEffect, useState } from 'react'
import { ArrowUpRight } from 'lucide-react'
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
        if (active) setCategories(response.data.sort((a, b) => a.sortOrder - b.sortOrder))
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

  return (
    <section className="border-y border-line bg-paper py-16 sm:py-20">
      <div className="editorial-container">
        <div className="mb-10 flex items-end justify-between gap-6">
          <div>
            <p className="editorial-label">Curated spaces</p>
            <h2 className="editorial-heading mt-3 text-4xl sm:text-5xl">Shop by category</h2>
          </div>
          <Link
            to="/shop"
            className="editorial-link hidden items-center gap-1 text-sm sm:inline-flex"
          >
            View all <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>

        {loading && (
          <div className="grid grid-cols-1 gap-px bg-line sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className="aspect-[4/5] animate-pulse bg-ivory" />
            ))}
          </div>
        )}
        {!loading && error && <p className="editorial-panel p-6 text-sm text-muted-ink">{error}</p>}
        {!loading && !error && categories.length === 0 && (
          <p className="editorial-panel p-6 text-sm text-muted-ink">
            Collections are being updated. Please check back soon.
          </p>
        )}
        {!loading && !error && categories.length > 0 && (
          <div className="grid grid-cols-1 gap-px bg-line sm:grid-cols-2 lg:grid-cols-4">
            {categories.map((category) => (
              <Link
                key={category.id}
                to={`/shop?category=${category.slug}`}
                className="group bg-paper p-3"
              >
                <div className="aspect-[4/5] overflow-hidden bg-ivory">
                  <img
                    src={category.imageUrl}
                    alt={category.name}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="flex items-start justify-between gap-3 border-b border-line py-4">
                  <div>
                    <h3 className="font-serif text-xl font-bold text-ink">{category.name}</h3>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-ink">
                      {category.description}
                    </p>
                  </div>
                  <ArrowUpRight className="mt-1 h-4 w-4 shrink-0 text-cognac transition-colors group-hover:text-ink" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
