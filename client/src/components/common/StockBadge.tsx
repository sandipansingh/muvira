import React from 'react'
import { LOW_STOCK_THRESHOLD } from '../../lib/constants/stock.constants'

interface StockBadgeProps {
  quantity: number
  isAvailable: boolean
}

export const StockBadge: React.FC<StockBadgeProps> = ({ quantity, isAvailable }) => {
  if (!isAvailable || quantity === 0) {
    return (
      <span className="inline-flex items-center gap-1.5 border border-danger px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-danger">
        Out of stock
      </span>
    )
  }
  if (quantity <= LOW_STOCK_THRESHOLD) {
    return (
      <span className="inline-flex items-center gap-1.5 border border-warning px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-warning">
        Only {quantity} left
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 border border-success px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-success">
      In stock
    </span>
  )
}
