import React from 'react'
import type { ProductDetail, ProductListItem } from '../../lib/types/product'
import { ProductCard } from './ProductCard'

interface ProductGridProps {
  products: (ProductListItem | ProductDetail)[]
  loading?: boolean
}

export const ProductGrid: React.FC<ProductGridProps> = ({ products, loading = false }) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((item) => (
          <div key={item} className="animate-pulse border-b border-line pb-4">
            <div className="aspect-square bg-ivory" />
            <div className="mt-4 h-3 w-1/3 bg-line" />
            <div className="mt-2 h-5 w-3/4 bg-line" />
          </div>
        ))}
      </div>
    )
  }

  if (products.length === 0) {
    return (
      <div className="editorial-panel p-12 text-center">
        <h2 className="font-serif text-2xl font-bold text-ink">No products found</h2>
        <p className="mt-2 text-sm text-muted-ink">
          Try broadening your search query or selecting another category.
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  )
}
