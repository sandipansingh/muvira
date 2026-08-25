import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Package } from 'lucide-react'
import { categoryService } from '../lib/services/category.service'
import type { Category } from '../lib/types/category'
import { ShopHero } from '../components/catalog/ShopHero'

export const CategoriesPage: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    const loadCategories = async () => {
      try {
        const response = await categoryService.getCategories()
        if (response.success && active) {
          setCategories(response.data.sort((a, b) => a.sortOrder - b.sortOrder))
        }
      } catch {
        if (active) setCategories([])
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
        subtitle="Explore our handcrafted collections crafted for every room, shrine, and lifestyle."
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Categories' }]}
      />

      <div className="layout-container py-4 sm:py-8">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="aspect-[4/3] rounded-2xl bg-surface animate-pulse border border-line"
              />
            ))}
          </div>
        ) : categories.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line bg-surface py-16 text-center">
            <Package className="h-10 w-10 text-muted mx-auto mb-3" />
            <h2 className="font-display text-xl text-ink font-normal">No categories available</h2>
            <Link
              to="/shop"
              className="mt-4 inline-block rounded-lg bg-ink text-white px-5 py-2.5 text-xs font-normal"
            >
              Browse All Products
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {categories.map((category) => (
              <Link
                key={category.id}
                to={`/category/${category.slug}`}
                className="group relative overflow-hidden rounded-2xl md:rounded-3xl bg-surface border border-line p-6 flex flex-col justify-between min-h-[260px] sm:min-h-[300px] transition-all duration-300 hover:shadow-card hover:border-field-border"
              >
                {/* Background Image Container */}
                <div className="absolute inset-0 flex items-center justify-center p-6 opacity-80 transition-transform duration-500 group-hover:scale-105">
                  {category.imageUrl ? (
                    <img
                      src={category.imageUrl}
                      alt={category.name}
                      className="max-h-full max-w-full object-contain"
                      loading="lazy"
                    />
                  ) : (
                    <div className="text-xs text-muted">No image</div>
                  )}
                </div>

                {/* Subtle top/bottom gradient overlay for legibility */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-80" />

                {/* Top Badge */}
                <div className="relative z-10">
                  <span className="inline-block rounded-full bg-white/90 backdrop-blur-xs px-3 py-1 text-[11px] font-medium text-ink shadow-xs">
                    Collection
                  </span>
                </div>

                {/* Bottom Title & Action */}
                <div className="relative z-10 text-white">
                  <h3 className="font-display text-2xl font-normal text-white">{category.name}</h3>
                  {category.description && (
                    <p className="mt-1 text-xs text-white/80 line-clamp-1">
                      {category.description}
                    </p>
                  )}
                  <div className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-white group-hover:underline underline-offset-4">
                    <span>Explore Collection</span>
                    <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-1" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Bottom CTA to View All Catalog */}
        <div className="mt-12 text-center pt-8 border-t border-line">
          <p className="text-sm text-muted mb-4 font-normal">
            Looking for something specific or want to browse everything together?
          </p>
          <Link
            to="/shop"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-ink hover:bg-black text-white px-6 py-3 text-xs sm:text-sm font-normal transition-colors"
          >
            <span>Browse Full Catalog</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </main>
  )
}

export default CategoriesPage
