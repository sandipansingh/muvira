import React from 'react'
import { SlidersHorizontal } from 'lucide-react'

interface FilterBarProps {
  categories: { name: string; slug: string }[]
  selectedCategory: string
  onSelectCategory: (slug: string) => void
  sortBy: string
  onSortChange: (sort: string) => void
  totalCount: number
}

export const FilterBar: React.FC<FilterBarProps> = ({
  categories,
  selectedCategory,
  onSelectCategory,
  sortBy,
  onSortChange,
  totalCount,
}) => {
  return (
    <div className="mb-10 border-y border-line py-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="no-scrollbar flex items-center gap-5 overflow-x-auto">
          {['all', ...categories.map((category) => category.slug)].map((slug) => {
            const label =
              slug === 'all' ? 'All products' : categories.find((item) => item.slug === slug)?.name
            return (
              <button
                key={slug}
                type="button"
                onClick={() => onSelectCategory(slug)}
                className={`shrink-0 border-b pb-2 text-xs font-semibold transition-colors ${
                  selectedCategory === slug
                    ? 'border-ink text-ink'
                    : 'border-transparent text-muted-ink hover:border-line hover:text-ink'
                }`}
              >
                {label}
              </button>
            )
          })}
        </div>
        <div className="flex items-center justify-between gap-4 text-xs text-muted-ink md:justify-end">
          <span>
            <strong className="font-semibold text-ink">{totalCount}</strong> pieces
          </span>
          <label className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4" />
            <span className="sr-only">Sort products</span>
            <select
              id="shop-sort"
              name="sort"
              value={sortBy}
              onChange={(event) => onSortChange(event.target.value)}
              className="border-0 bg-transparent py-1 text-base font-semibold text-ink focus:outline-none focus:ring-0"
            >
              <option value="popularity">Popular</option>
              <option value="price_asc">Price: low to high</option>
              <option value="price_desc">Price: high to low</option>
              <option value="newest">Newest</option>
            </select>
          </label>
        </div>
      </div>
    </div>
  )
}
