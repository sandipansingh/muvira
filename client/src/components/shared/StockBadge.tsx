import React from 'react'

interface StockBadgeProps {
  stock: number
}

export const StockBadge: React.FC<StockBadgeProps> = ({ stock }) => {
  if (stock <= 0) {
    return (
      <span className="text-xs font-medium uppercase tracking-wider text-secondary500">
        Out of Stock
      </span>
    )
  }

  if (stock <= 5) {
    return (
      <span className="text-xs font-medium uppercase tracking-wider text-secondary700">
        Only {stock} Left
      </span>
    )
  }

  return (
    <span className="text-xs font-medium uppercase tracking-wider text-secondary500">In Stock</span>
  )
}

export default StockBadge
