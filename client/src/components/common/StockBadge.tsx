import React from 'react'
import { LOW_STOCK_THRESHOLD } from '../../lib/constants/stock.constants'

interface StockBadgeProps {
  quantity: number
  isAvailable: boolean
}

export const StockBadge: React.FC<StockBadgeProps> = ({ quantity, isAvailable }) => {
  if (!isAvailable || quantity === 0) {
    return <span className="text-ui font-semibold text-danger">Out of stock</span>
  }
  if (quantity <= LOW_STOCK_THRESHOLD) {
    return <span className="text-ui font-semibold text-warning">Only {quantity} left</span>
  }
  return null
}
