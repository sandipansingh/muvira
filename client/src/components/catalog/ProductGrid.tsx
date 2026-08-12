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
          <div key={item} className="aspect-[4/3] rounded-[2rem] animate-pulse bg-neutral-100" />
        ))}
      </div>
    )
  }

  if (products.length === 0) {
    return (
      <div className="border-y border-border-light py-16 text-center">
        <h2 className="font-display text-2xl font-bold text-foreground">No pieces found</h2>
        <p className="mt-2 text-sm text-neutral-500">
          Try broadening your search query or selecting another collection.
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

export default ProductGrid
