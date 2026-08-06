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
    <section className="bg-white py-12 sm:py-16">
      <div className="editorial-container">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Curated Collections
            </span>
            <h2 className="font-serif text-3xl font-extrabold text-slate-900 sm:text-4xl mt-1">
              Explore Popular Categories
            </h2>
          </div>
          <Link
            to="/shop"
            className="hidden items-center gap-1.5 text-sm font-semibold text-slate-700 hover:text-slate-900 sm:inline-flex"
          >
            <span>View All</span>
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>

        {loading && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {[1, 2, 3, 4, 5, 6].map((item) => (
              <div key={item} className="h-44 animate-pulse rounded-2xl bg-slate-100" />
            ))}
          </div>
        )}

        {!loading && error && (
          <p className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
            {error}
          </p>
        )}

        {!loading && !error && categories.length === 0 && (
          <p className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
            Collections are being updated. Please check back soon.
          </p>
        )}

        {!loading && !error && categories.length > 0 && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {categories.map((category) => (
              <Link
                key={category.id}
                to={`/shop?category=${category.slug}`}
                className="group flex flex-col items-center rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 text-center transition-all duration-300 hover:border-slate-300 hover:bg-white hover:shadow-lg hover:-translate-y-1"
              >
                <div className="relative aspect-square w-24 h-24 sm:w-28 sm:h-28 overflow-hidden rounded-full bg-white p-2 shadow-xs group-hover:shadow-md transition-all">
                  <img
                    src={category.imageUrl}
                    alt={category.name}
                    className="h-full w-full rounded-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                </div>
                <h3 className="mt-3.5 text-sm font-bold text-slate-900 group-hover:text-slate-700">
                  {category.name}
                </h3>
                <p className="mt-0.5 line-clamp-1 text-xs text-slate-500 font-medium">
                  {category.description}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
