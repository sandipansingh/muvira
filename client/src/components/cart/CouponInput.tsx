import React, { useState } from 'react'
import { CheckCircle, Tag, X } from 'lucide-react'
import { useCart } from '../../context/CartContext'

export const CouponInput: React.FC = () => {
  const { coupon, applyCoupon, removeCoupon } = useCart()
  const [code, setCode] = useState('')
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (code.trim() && (await applyCoupon(code))) setCode('')
  }

  if (coupon) {
    return (
      <div className="flex items-center justify-between border border-success bg-success-soft p-3 text-xs text-success">
        <div className="flex items-center gap-2">
          <CheckCircle className="h-4 w-4 shrink-0" />
          <span className="font-semibold">{coupon.code} applied</span>
        </div>
        <button
          type="button"
          onClick={removeCoupon}
          className="p-1 transition-colors hover:text-ink"
          aria-label="Remove coupon"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <div className="relative flex-1">
        <label htmlFor="coupon-code" className="sr-only">
          Promo code
        </label>
        <input
          id="coupon-code"
          name="coupon"
          type="text"
          placeholder="Enter promo code"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          className="editorial-input pl-9"
        />
        <Tag className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-ink" />
      </div>
      <button type="submit" className="editorial-button shrink-0">
        Apply
      </button>
    </form>
  )
}
