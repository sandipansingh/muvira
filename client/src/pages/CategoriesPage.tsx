import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Package } from 'lucide-react'
import { categoryService } from '../lib/services/category.service'
import type { Category } from '../lib/types/category'
import { ShopHero } from '../components/catalog/ShopHero'

export const CategoriesPage: React.FC = () => {
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
    <main className="min-h-screen pb-16 bg-paper">
      <ShopHero
        title="Product Categories"
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Categories' }]}
      />

      <div className="layout-container py-4 sm:py-8">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="aspect-[4/3] rounded-2xl md:rounded-3xl bg-surface animate-pulse"
              />
            ))}
          </div>
        ) : error ? (
          <div className="py-16 text-center text-sm text-ink">
            Categories could not be loaded: {error}
          </div>
        ) : categories.length === 0 ? (
          <div className="py-16 sm:py-24 text-center flex flex-col items-center justify-center">
            <div className="h-12 w-12 rounded-full bg-surface flex items-center justify-center text-muted mb-4">
              <Package className="h-6 w-6 stroke-[1.5]" />
            </div>
            <h2 className="font-display text-2xl text-ink font-bold">No categories available</h2>
            <Link
              to="/shop"
              className="mt-6 inline-block rounded-lg bg-ink hover:bg-black text-white px-5 py-2.5 text-xs font-normal transition-colors"
            >
              Browse All Products
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {categories.map((category) => (
              <Link
                key={category.id}
                to={`/shop?category=${category.slug}`}
                className="group relative overflow-hidden rounded-2xl md:rounded-3xl bg-surface p-6 flex flex-col justify-end min-h-[300px] sm:min-h-[340px] transition-all duration-300 hover:shadow-card"
              >
                {/* Full-Bleed Zoomed Image */}
                {category.imageUrl ? (
                  <img
                    src={category.imageUrl}
                    alt={category.name}
                    width={800}
                    height={600}
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                    loading="lazy"
                  />
                ) : (
                  <div className="absolute inset-0 bg-surface flex items-center justify-center text-xs text-muted">
                    No image available
                  </div>
                )}

                {/* Dark Gradient Overlay for legibility */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent pointer-events-none" />

                {/* Bottom Content */}
                <div className="relative z-10 text-white">
                  <h3 className="font-display text-2xl font-semibold text-white">
                    {category.name}
                  </h3>
                  {category.description && (
                    <p className="mt-1 text-xs text-white/80 line-clamp-1">
                      {category.description}
                    </p>
                  )}
                  <div className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-white group-hover:underline underline-offset-4">
                    <span>Explore Collection</span>
                    <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-1" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}

export default CategoriesPage
