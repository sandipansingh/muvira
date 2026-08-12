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
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 lg:gap-6 xl:grid-cols-4">
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
      <div className="border-y border-rule py-12 text-center">
        <h2 className="font-display text-heading-m-mobile font-bold text-ink sm:text-heading-m-desktop">
          No products found
        </h2>
        <p className="mt-2 text-body text-muted">
          Try broadening your search query or selecting another category.
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 lg:gap-6 xl:grid-cols-4">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  )
}
