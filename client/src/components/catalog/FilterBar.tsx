import React from 'react'
import { Select } from '../ui/Select'

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
    <div className="mb-10 grid gap-8 border-y border-[var(--color-line)] py-6 lg:grid-cols-[12rem_1fr]">
      <div>
        <p className="eyebrow mb-3">Categories</p>
        <div className="no-scrollbar flex gap-2 overflow-x-auto lg:flex-col lg:gap-1">
          {[{ name: 'All Products', slug: 'all' }, ...categories].map((category) => {
            const isSelected = selectedCategory === category.slug
            return (
              <button
                key={category.slug}
                type="button"
                onClick={() => onSelectCategory(category.slug)}
                className={`shrink-0 border-b-2 px-1 py-2 text-left text-sm transition-colors lg:w-full ${
                  isSelected
                    ? 'border-[var(--color-ink)] font-semibold text-[var(--color-ink)]'
                    : 'border-transparent text-[var(--color-muted)] hover:text-[var(--color-ink)]'
                }`}
                aria-pressed={isSelected}
              >
                {category.name}
              </button>
            )
          })}
        </div>
      </div>
      <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
        <div>
          <p className="eyebrow mb-2">Collection</p>
          <p className="font-display text-xl font-semibold text-[var(--color-ink)]">
            Thoughtful pieces for lived-in rooms
          </p>
        </div>
        <div className="flex items-center justify-between gap-4 text-sm text-[var(--color-muted)] lg:justify-end">
          <span aria-live="polite">
            <strong className="font-semibold text-[var(--color-ink)]">{totalCount}</strong> pieces
          </span>
          <label
            className="flex items-center gap-2 font-semibold text-[var(--color-ink)]"
            htmlFor="shop-sort"
          >
            <span>Sort by</span>
            <Select
              id="shop-sort"
              name="sort"
              value={sortBy}
              onChange={(event) => onSortChange(event.target.value)}
              className="h-11 min-h-11 w-auto py-2 text-base"
              options={[
                { value: 'popularity', label: 'Popularity' },
                { value: 'price_asc', label: 'Price: Low to High' },
                { value: 'price_desc', label: 'Price: High to Low' },
                { value: 'newest', label: 'Newest Arrivals' },
              ]}
            />
          </label>
        </div>
      </div>
    </div>
  )
}

export default FilterBar
