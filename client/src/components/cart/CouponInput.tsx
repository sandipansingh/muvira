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
      <div className="flex items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50/90 p-3.5 text-xs text-emerald-950">
        <div className="flex items-center gap-2">
          <CheckCircle className="h-4 w-4 shrink-0 text-emerald-600" />
          <span className="font-bold">{coupon.code} applied</span>
        </div>
        <button
          type="button"
          onClick={removeCoupon}
          className="p-1 rounded-full text-emerald-800 hover:bg-emerald-100 transition-colors cursor-pointer"
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
          className="editorial-input pl-9 text-xs"
        />
        <Tag className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
      </div>
      <button type="submit" className="editorial-button shrink-0 text-xs py-2 px-4 font-bold">
        Apply
      </button>
    </form>
  )
}

export default CouponInput
