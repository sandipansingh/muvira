import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { categoryService } from '../../lib/services/category.service'
import type { Category } from '../../lib/types/category'
import { SectionHeader } from '../common/SectionHeader'
import { SeeAllLink } from '../common/SeeAllLink'

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
    <section className="py-gap-section layout-container overflow-hidden">
      <SectionHeader
        title="Explore Collections"
        subtitle="Handcrafted solid wood pieces designed to elevate every corner of your home"
        rightSlot={<SeeAllLink href="/shop" label="See All" />}
      />

      {loading && (
        <div
          className="flex gap-4 sm:gap-6 overflow-hidden sm:grid sm:grid-cols-2 lg:grid-cols-4"
          aria-busy="true"
        >
          {[1, 2, 3, 4].map((item) => (
            <div
              key={item}
              className="aspect-[4/3] w-[280px] sm:w-auto shrink-0 rounded-[2rem] animate-pulse bg-neutral-100"
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
        <div className="flex gap-4 sm:gap-6 overflow-x-auto snap-x snap-mandatory no-scrollbar pb-4 sm:pb-0 sm:grid sm:grid-cols-2 lg:grid-cols-4">
          {visibleCategories.map((category) => (
            <Link
              key={category.id}
              to={`/shop?category=${category.slug}`}
              className="group w-[260px] sm:w-auto shrink-0 snap-start bg-white rounded-[2rem] border border-neutral-100 overflow-hidden shadow-none transition-all duration-200 flex flex-col justify-between"
            >
              <div className="relative aspect-[4/3] bg-neutral-100 overflow-hidden rounded-b-[1.5rem]">
                <img
                  src={category.imageUrl}
                  alt={category.name}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>
              <div className="p-4 sm:p-5">
                <h3 className="font-bold text-base text-foreground leading-snug group-hover:text-brand transition-colors">
                  {category.name}
                </h3>
                {category.itemCount !== undefined && (
                  <p className="mt-1 text-xs text-neutral-500 font-normal">
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
