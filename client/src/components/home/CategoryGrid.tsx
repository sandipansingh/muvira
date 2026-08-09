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
        {/* Section Header with Right-Aligned Link */}
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <h2 className="font-serif text-3xl font-bold text-slate-900 sm:text-4xl tracking-tight">
              Shop by Categories
            </h2>
            <p className="mt-1 text-sm text-slate-500 font-medium">
              Explore curated collections for every corner of your home
            </p>
          </div>
          <Link
            to="/shop"
            className="hidden items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-700 hover:text-[#7e3d1c] sm:inline-flex transition-colors"
          >
            <span>View All Categories</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {loading && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {[1, 2, 3, 4, 5, 6].map((item) => (
              <div key={item} className="h-56 animate-pulse rounded-2xl bg-slate-100" />
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
                className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3 transition-all duration-300 hover:border-slate-300 hover:bg-white hover:shadow-xl hover:-translate-y-1"
              >
                <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-white">
                  <img
                    src={category.imageUrl}
                    alt={category.name}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                </div>
                <div className="mt-3 flex items-center justify-between px-1">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 group-hover:text-[#7e3d1c] transition-colors">
                      {category.name}
                    </h3>
                    <span className="text-[11px] font-semibold text-slate-500">Shop Now</span>
                  </div>
                  <div className="rounded-full bg-slate-200/60 p-1.5 text-slate-700 transition-all group-hover:bg-[#7e3d1c] group-hover:text-white">
                    <ArrowRight className="h-3.5 w-3.5" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
