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
    <div className="mb-8 rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 shadow-xs">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="no-scrollbar flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          {['all', ...categories.map((category) => category.slug)].map((slug) => {
            const label =
              slug === 'all' ? 'All products' : categories.find((item) => item.slug === slug)?.name
            const isSelected = selectedCategory === slug
            return (
              <button
                key={slug}
                type="button"
                onClick={() => onSelectCategory(slug)}
                className={`shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition-all ${
                  isSelected
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                {label}
              </button>
            )
          })}
        </div>

        <div className="flex items-center justify-between gap-4 text-xs text-slate-500 md:justify-end">
          <span>
            <strong className="font-bold text-slate-900">{totalCount}</strong> products
          </span>

          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 shadow-xs">
            <SlidersHorizontal className="h-4 w-4 text-slate-500" />
            <select
              id="shop-sort"
              name="sort"
              value={sortBy}
              onChange={(event) => onSortChange(event.target.value)}
              className="border-0 bg-transparent py-0.5 text-xs font-bold text-slate-800 focus:outline-none"
            >
              <option value="popularity">Sort: Popularity</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="newest">Sort: Newest</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  )
}
