import React from 'react'
import { LOW_STOCK_THRESHOLD } from '../../lib/constants/stock.constants'

interface StockBadgeProps {
  quantity: number
  isAvailable: boolean
}

export const StockBadge: React.FC<StockBadgeProps> = ({ quantity, isAvailable }) => {
  if (!isAvailable || quantity === 0) {
    return (
      <span className="inline-flex min-h-5 items-center rounded-[var(--radius-control)] border border-danger bg-danger-soft px-2 text-[10px] font-bold uppercase tracking-wider text-danger">
        Out of stock
      </span>
    )
  }
  if (quantity <= LOW_STOCK_THRESHOLD) {
    return (
      <span className="inline-flex min-h-5 items-center rounded-[var(--radius-control)] border border-warning bg-warning-soft px-2 text-[10px] font-bold uppercase tracking-wider text-warning">
        Only {quantity} left
      </span>
    )
  }
  return null
}

export default StockBadge
