import React from 'react'
import { LOW_STOCK_THRESHOLD } from '../../lib/constants/stock.constants'

interface StockBadgeProps {
  quantity: number
  isAvailable: boolean
}

export const StockBadge: React.FC<StockBadgeProps> = ({ quantity, isAvailable }) => {
  if (!isAvailable || quantity === 0) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">
        <span className="w-1.5 h-1.5 rounded-full bg-red-600" />
        Out of Stock
      </span>
    )
  }

  if (quantity <= LOW_STOCK_THRESHOLD) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse" />
        Only {quantity} left in stock
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
      In Stock
    </span>
  )
}
