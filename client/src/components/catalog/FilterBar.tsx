import React from 'react'
import { SegmentedControl } from '../common/SegmentedControl'

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
  const options = [
    { label: 'All Products', value: 'all' },
    ...categories.map((c) => ({ label: c.name, value: c.slug })),
  ]

  return (
    <div className="mb-8 border-y border-border-light py-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="no-scrollbar flex items-center overflow-x-auto pb-1 lg:pb-0">
          <SegmentedControl
            options={options}
            value={selectedCategory}
            onChange={onSelectCategory}
            layoutId="shop-category-filter"
            size="sm"
          />
        </div>

        <div className="flex items-center justify-between gap-4 text-xs font-semibold text-neutral-500 lg:justify-end">
          <span aria-live="polite">
            <strong className="font-bold text-foreground">{totalCount}</strong> pieces found
          </span>

          <label
            className="flex items-center gap-2 text-xs font-bold text-foreground"
            htmlFor="shop-sort"
          >
            <span>Sort:</span>
            <select
              id="shop-sort"
              name="sort"
              value={sortBy}
              onChange={(event) => onSortChange(event.target.value)}
              className="rounded-xl border border-border-light bg-neutral-50/80 py-1.5 px-3 text-xs font-semibold text-foreground transition-colors hover:border-neutral-300 focus:border-foreground focus:outline-none cursor-pointer"
            >
              <option value="popularity">Popularity</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="newest">Newest Arrivals</option>
            </select>
          </label>
        </div>
      </div>
    </div>
  )
}

export default FilterBar
