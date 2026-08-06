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
    <div className="bg-white border-b border-zinc-200 py-4 mb-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Category Tag Chips */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          <button
            onClick={() => onSelectCategory('all')}
            className={`px-4 py-2 rounded-full text-xs font-semibold transition-all shrink-0 ${
              selectedCategory === 'all'
                ? 'bg-zinc-900 text-white shadow-xs'
                : 'bg-[#F6F4EF] text-zinc-700 hover:bg-zinc-200'
            }`}
          >
            All Products
          </button>
          {categories.map((cat) => (
            <button
              key={cat.slug}
              onClick={() => onSelectCategory(cat.slug)}
              className={`px-4 py-2 rounded-full text-xs font-semibold transition-all shrink-0 ${
                selectedCategory === cat.slug
                  ? 'bg-zinc-900 text-white shadow-xs'
                  : 'bg-[#F6F4EF] text-zinc-700 hover:bg-zinc-200'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Right side: Count & Sort Dropdown */}
        <div className="flex items-center justify-between md:justify-end gap-4 shrink-0">
          <span className="text-xs font-medium text-zinc-500">
            Showing <strong className="text-zinc-900">{totalCount}</strong> items
          </span>

          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-zinc-500" />
            <select
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value)}
              className="bg-[#F6F4EF] border border-zinc-300 text-zinc-800 text-xs font-semibold rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#C88D35]"
            >
              <option value="featured">Sort by: Featured</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="rating">Highest Rated</option>
              <option value="newest">Newest Additions</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  )
}
