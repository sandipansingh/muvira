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
      <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-6 lg:grid-cols-3 xl:grid-cols-4">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((item) => (
          <div key={item} className="flex animate-pulse flex-col gap-2">
            <div className="aspect-square rounded-[var(--radius-card)] bg-[var(--color-surface)]" />
            <div className="h-3 w-16 rounded bg-[var(--color-line)]" />
            <div className="h-4 w-3/4 rounded bg-[var(--color-line)]" />
            <div className="h-4 w-1/3 rounded bg-[var(--color-line)]" />
          </div>
        ))}
      </div>
    )
  }

  if (products.length === 0) {
    return (
      <div className="border-y border-[var(--color-line)] py-16 text-center">
        <h2 className="heading text-2xl">No pieces found</h2>
        <p className="body-copy mt-2 text-sm">
          Try broadening your search query or selecting another collection.
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-10 lg:grid-cols-3 lg:gap-x-6 xl:grid-cols-4">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  )
}

export default ProductGrid
