import React, { useState } from 'react'
import { CheckCircle, Loader2, Tag, X } from 'lucide-react'
import { useCart } from '../../context/CartContext'
import { formatPrice } from '../../lib/utils/format'

export const CouponInput: React.FC = () => {
  const { coupon, applyCoupon, removeCoupon } = useCart()
  const [code, setCode] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    const trimmedCode = code.trim().toUpperCase()
    if (!trimmedCode || isSubmitting) return

    setIsSubmitting(true)
    try {
      const success = await applyCoupon(trimmedCode)
      if (success) setCode('')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (coupon) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-emerald-300 bg-emerald-50/90 px-3 py-2 text-xs text-emerald-800 transition-all">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            <CheckCircle className="h-3 w-3" />
          </div>
          <div className="flex flex-wrap items-center gap-1.5 text-xs font-medium">
            <span className="font-bold tracking-wider text-emerald-950 uppercase">
              {coupon.code}
            </span>
            <span className="text-emerald-700">(-{formatPrice(coupon.discountAmount)} off)</span>
          </div>
        </div>
        <button
          type="button"
          onClick={removeCoupon}
          className="cursor-pointer rounded-full p-0.5 text-emerald-700 transition-colors hover:bg-emerald-200/60"
          aria-label="Remove coupon"
          title="Remove coupon"
        >
          <X className="h-3.5 w-3.5" />
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
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-neutral-400">
          <Tag className="h-3.5 w-3.5" />
        </div>
        <input
          id="coupon-code"
          name="coupon"
          type="text"
          placeholder="Enter promo code"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          className="w-full min-h-[2.35rem] rounded-lg border border-[var(--kit-field-border)] bg-[var(--kit-paper)] py-1.5 pl-8.5 pr-2.5 text-xs font-medium text-[var(--kit-ink)] placeholder:text-neutral-400 placeholder:normal-case outline-none transition-all duration-200 focus:border-[var(--kit-ink)] focus:ring-1 focus:ring-[var(--kit-ink)] uppercase"
        />
      </div>
      <button
        type="submit"
        disabled={!code.trim() || isSubmitting}
        className="kit-button shrink-0 min-h-[2.35rem] px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Apply'}
      </button>
    </form>
  )
}

export default CouponInput
