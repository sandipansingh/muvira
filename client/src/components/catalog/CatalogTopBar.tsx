import React from 'react'
import { LayoutGrid, Grid3x3, Columns2, List, SlidersHorizontal } from 'lucide-react'
import { Dropdown, type DropdownOption } from '../ui/Dropdown'

export type GridViewMode = 'grid-4' | 'grid-3' | 'grid-2' | 'list'

interface CatalogTopBarProps {
  title: string
  totalCount: number
  sortBy: string
  onSortChange: (sort: string) => void
  viewMode: GridViewMode
  onViewModeChange: (mode: GridViewMode) => void
  onOpenMobileFilters?: () => void
  activeFiltersCount?: number
  className?: string
}

const SORT_OPTIONS: DropdownOption[] = [
  { value: 'newest', label: 'Newest Arrivals' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'popularity', label: 'Popularity' },
]

export const CatalogTopBar: React.FC<CatalogTopBarProps> = ({
  title,
  totalCount,
  sortBy,
  onSortChange,
  viewMode,
  onViewModeChange,
  onOpenMobileFilters,
  activeFiltersCount = 0,
  className = '',
}) => {
  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 mb-6 border-b border-line ${className}`}
    >
      {/* Title & Count */}
      <div className="flex items-baseline gap-3">
        <h2 className="font-display text-xl sm:text-2xl font-normal text-ink">{title}</h2>
        <span className="text-xs sm:text-sm text-muted font-normal">
          <strong className="text-ink font-normal">{totalCount}</strong> pieces
        </span>
      </div>

      {/* Controls: Mobile Filter Button, Sort Dropdown & View Mode Switcher */}
      <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-5">
        {/* Mobile Filter Toggle */}
        <button
          type="button"
          onClick={onOpenMobileFilters}
          className="lg:hidden flex items-center gap-2 px-3 py-1.5 rounded-lg border border-line bg-surface text-ink text-xs font-normal hover:bg-line transition-colors cursor-pointer"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          <span>Filter</span>
          {activeFiltersCount > 0 && (
            <span className="h-4 w-4 rounded-full bg-ink text-white text-[10px] flex items-center justify-center font-bold">
              {activeFiltersCount}
            </span>
          )}
        </button>

        <div className="flex items-center gap-3">
          {/* Sort Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted font-normal hidden sm:inline">Sort by:</span>
            <Dropdown
              id="catalog-sort"
              value={sortBy}
              onChange={onSortChange}
              options={SORT_OPTIONS}
              variant="slim"
              className="w-40 sm:w-44 text-xs"
            />
          </div>

          {/* View Density Switcher (Desktop only) */}
          <div className="hidden md:flex items-center gap-1 border border-line rounded-lg p-0.5 bg-paper">
            <button
              type="button"
              onClick={() => onViewModeChange('grid-4')}
              className={`p-1.5 rounded transition-colors cursor-pointer ${
                viewMode === 'grid-4'
                  ? 'bg-surface text-ink shadow-xs'
                  : 'text-muted hover:text-ink'
              }`}
              title="4 Columns Grid"
              aria-label="4 Columns Grid"
              aria-pressed={viewMode === 'grid-4'}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange('grid-3')}
              className={`p-1.5 rounded transition-colors cursor-pointer ${
                viewMode === 'grid-3'
                  ? 'bg-surface text-ink shadow-xs'
                  : 'text-muted hover:text-ink'
              }`}
              title="3 Columns Grid"
              aria-label="3 Columns Grid"
              aria-pressed={viewMode === 'grid-3'}
            >
              <Grid3x3 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange('grid-2')}
              className={`p-1.5 rounded transition-colors cursor-pointer ${
                viewMode === 'grid-2'
                  ? 'bg-surface text-ink shadow-xs'
                  : 'text-muted hover:text-ink'
              }`}
              title="2 Columns Grid"
              aria-label="2 Columns Grid"
              aria-pressed={viewMode === 'grid-2'}
            >
              <Columns2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange('list')}
              className={`p-1.5 rounded transition-colors cursor-pointer ${
                viewMode === 'list' ? 'bg-surface text-ink shadow-xs' : 'text-muted hover:text-ink'
              }`}
              title="List View"
              aria-label="List View"
              aria-pressed={viewMode === 'list'}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CatalogTopBar
