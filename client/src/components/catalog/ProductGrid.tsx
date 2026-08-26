import React from 'react'
import type { ProductDetail, ProductListItem } from '../../lib/types/product'
import { ProductCard } from './ProductCard'
import type { GridViewMode } from './CatalogTopBar'
import { PackageOpen } from 'lucide-react'

interface ProductGridProps {
  products: (ProductListItem | ProductDetail)[]
  loading?: boolean
  viewMode?: GridViewMode
  onResetFilters?: () => void
}

export const ProductGrid: React.FC<ProductGridProps> = ({
  products,
  loading = false,
  viewMode = 'grid-3',
  onResetFilters,
}) => {
  const getGridClasses = () => {
    switch (viewMode) {
      case 'grid-4':
        return 'grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6'
      case 'grid-2':
        return 'grid grid-cols-1 sm:grid-cols-2 gap-6'
      case 'list':
        return 'flex flex-col gap-4'
      case 'grid-3':
      default:
        return 'grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6'
    }
  }

  if (loading) {
    return (
      <div className={getGridClasses()} aria-busy="true">
        {[1, 2, 3, 4, 5, 6].map((item) => (
          <div key={item} className="flex flex-col gap-3 animate-pulse">
            <div className="aspect-square rounded-2xl bg-surface" />
            <div className="h-3 w-16 rounded bg-line" />
            <div className="h-4 w-3/4 rounded bg-line" />
            <div className="h-4 w-1/3 rounded bg-line" />
          </div>
        ))}
      </div>
    )
  }

  if (products.length === 0) {
    return (
      <div className="py-16 sm:py-24 text-center flex flex-col items-center justify-center">
        <div className="h-12 w-12 rounded-full bg-surface flex items-center justify-center text-muted mb-4">
          <PackageOpen className="h-6 w-6 stroke-[1.5]" />
        </div>
        <h3 className="font-display text-2xl font-semibold text-ink">No pieces found</h3>
        <p className="mt-2 text-sm text-muted max-w-md font-normal">
          We couldn't find any products matching your selected filters or search query.
        </p>
        {onResetFilters && (
          <button
            type="button"
            onClick={onResetFilters}
            className="mt-6 rounded-lg bg-ink hover:bg-black text-white px-5 py-2.5 text-xs font-normal transition-colors cursor-pointer"
          >
            Clear All Filters
          </button>
        )}
      </div>
    )
  }

  return (
    <div className={getGridClasses()}>
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          variant={viewMode === 'list' ? 'horizontal' : 'vertical'}
        />
      ))}
    </div>
  )
}

export default ProductGrid
