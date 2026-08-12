import React from 'react'
import { LOW_STOCK_THRESHOLD } from '../../lib/constants/stock.constants'

interface StockBadgeProps {
  quantity: number
  isAvailable: boolean
}

export const StockBadge: React.FC<StockBadgeProps> = ({ quantity, isAvailable }) => {
  if (!isAvailable || quantity === 0) {
    return (
      <span className="text-[10px] font-bold uppercase tracking-wider text-red-600 bg-red-50 px-2.5 py-0.5 rounded-full">
        Out of stock
      </span>
    )
  }
  if (quantity <= LOW_STOCK_THRESHOLD) {
    return (
      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full">
        Only {quantity} left
      </span>
    )
  }
  return null
}

export default StockBadge
