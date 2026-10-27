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
        title="Find your everyday ritual"
        subtitle="Explore the collection, one meaningful piece at a time."
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Categories' }]}
      />

      <div className="layout-container py-4 sm:py-8">
        {loading ? (
          <div className="category-page-grid">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="aspect-[4/3] rounded-card md:rounded-card bg-surface animate-pulse"
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
          <div className="category-page-grid">
            {categories.map((category) => (
              <Link
                key={category.id}
                to={`/shop?category=${category.slug}`}
                className="category-page-tile group"
              >
                {/* Full-Bleed Zoomed Image */}
                {category.imageUrl ? (
                  <img
                    src={category.imageUrl}
                    alt={category.name}
                    width={800}
                    height={600}
                    className="w-full aspect-[4/3] object-contain bg-surface transition-transform duration-300 group-hover:scale-[1.025]"
                    loading="lazy"
                  />
                ) : (
                  <div className="absolute inset-0 bg-surface flex items-center justify-center text-xs text-muted">
                    No image available
                  </div>
                )}

                {/* Dark Gradient Overlay for legibility */}

                {/* Bottom Content */}
                <div className="p-5 text-ink">
                  <h2 className="font-display text-2xl text-ink">{category.name}</h2>
                  {category.description && (
                    <p className="mt-2 text-sm text-muted">{category.description}</p>
                  )}
                  <div className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-ink group-hover:underline underline-offset-4">
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
