import React, { useState } from 'react'
import { Tag, CheckCircle, X } from 'lucide-react'
import { useCart } from '../../context/CartContext'

export const CouponInput: React.FC = () => {
  const { coupon, applyCoupon, removeCoupon } = useCart()
  const [code, setCode] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (code.trim()) {
      const success = applyCoupon(code)
      if (success) setCode('')
    }
  }

  if (coupon) {
    return (
      <div className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs">
        <div className="flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-semibold">{coupon.code} Applied</span>
          <span className="text-emerald-700">
            (
            {coupon.discountType === 'percentage'
              ? `${coupon.discountValue}% off`
              : `₹${coupon.discountValue / 100} off`}
            )
          </span>
        </div>
        <button
          onClick={removeCoupon}
          className="p-1 text-emerald-700 hover:text-emerald-950 transition-colors"
          aria-label="Remove coupon"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <div className="relative flex-1">
        <input
          type="text"
          placeholder="Promo code (e.g. WELCOME10)"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="w-full bg-[#F6F4EF] border border-zinc-300 rounded-xl pl-9 pr-4 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-[#C88D35]"
        />
        <Tag className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
      </div>
      <button
        type="submit"
        className="px-5 py-2.5 bg-zinc-900 hover:bg-[#C88D35] text-white text-xs font-semibold rounded-xl transition-colors shrink-0 shadow-xs"
      >
        Apply
      </button>
    </form>
  )
}
