import React from 'react'

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
    <div className="mb-8 border-y border-rule py-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="no-scrollbar flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0">
          {['all', ...categories.map((category) => category.slug)].map((slug) => {
            const label =
              slug === 'all' ? 'All products' : categories.find((item) => item.slug === slug)?.name
            const isSelected = selectedCategory === slug
            return (
              <button
                key={slug}
                type="button"
                onClick={() => onSelectCategory(slug)}
                className={`shrink-0 rounded-pill border px-4 py-2 text-ui font-semibold transition-colors duration-control ${
                  isSelected
                    ? 'border-ink bg-ink text-paper'
                    : 'border-rule bg-paper text-ink hover:border-ink'
                }`}
              >
                {label}
              </button>
            )
          })}
        </div>

        <div className="flex items-center justify-between gap-4 text-ui text-muted lg:justify-end">
          <span aria-live="polite">
            <strong className="font-semibold text-ink">{totalCount}</strong> products
          </span>

          <label
            className="flex items-center gap-2 text-ui font-semibold text-ink"
            htmlFor="shop-sort"
          >
            Sort
            <select
              id="shop-sort"
              name="sort"
              value={sortBy}
              onChange={(event) => onSortChange(event.target.value)}
              className="min-h-12 rounded-control border border-rule bg-surface px-3 text-base font-medium text-ink transition-colors duration-control focus:border-ink focus:outline-none"
            >
              <option value="popularity">Sort: Popularity</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="newest">Sort: Newest</option>
            </select>
          </label>
        </div>
      </div>
    </div>
  )
}
