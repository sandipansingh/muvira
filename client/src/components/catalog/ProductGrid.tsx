import React from 'react'
import type { ProductListItem, ProductDetail } from '../../lib/types/product'
import { ProductCard } from './ProductCard'

interface ProductGridProps {
  products: (ProductListItem | ProductDetail)[]
  loading?: boolean
}

export const ProductGrid: React.FC<ProductGridProps> = ({ products, loading = false }) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
          <div
            key={n}
            className="bg-[#F6F4EF] rounded-2xl p-3 border border-zinc-200 animate-pulse space-y-3"
          >
            <div className="aspect-square bg-zinc-200 rounded-xl" />
            <div className="h-4 bg-zinc-200 rounded-xs w-3/4" />
            <div className="h-4 bg-zinc-200 rounded-xs w-1/2" />
          </div>
        ))}
      </div>
    )
  }

  if (products.length === 0) {
    return (
      <div className="text-center py-20 bg-[#F6F4EF] rounded-3xl border border-zinc-200/80 p-8">
        <h3 className="font-serif text-2xl font-bold text-zinc-800">No products found</h3>
        <p className="text-sm text-zinc-500 mt-2">
          Try broadening your search query or selecting another category filter.
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  )
}
