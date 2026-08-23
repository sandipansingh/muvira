import React, { useState } from 'react'
import { CheckCircle, Tag, X } from 'lucide-react'
import { useCart } from '../../context/CartContext'
import { formatPrice } from '../../lib/utils/format'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'

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
      <div className="flex items-center justify-between rounded-lg border border-accent/30 bg-accent-soft px-3 py-2 text-xs text-accent transition-all">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-accent/20 text-accent">
            <CheckCircle className="h-3 w-3" />
          </div>
          <div className="flex flex-wrap items-center gap-1.5 text-xs font-normal">
            <span className="font-normal tracking-wider text-ink uppercase">{coupon.code}</span>
            <span className="text-accent">(-{formatPrice(coupon.discountAmount)} off)</span>
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={removeCoupon}
          className="h-6 w-6 text-accent hover:bg-accent/10"
          aria-label="Remove coupon"
          title="Remove coupon"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex h-10 items-stretch gap-2">
      <div className="relative flex-1">
        <label htmlFor="coupon-code" className="sr-only">
          Promo code
        </label>
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted z-10">
          <Tag className="h-3.5 w-3.5" />
        </div>
        <Input
          id="coupon-code"
          name="coupon"
          type="text"
          placeholder="Enter promo code"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          className="h-full pl-10 pr-2.5 font-normal uppercase placeholder:normal-case"
        />
      </div>
      <Button
        type="submit"
        variant="primary"
        size="sm"
        isLoading={isSubmitting}
        disabled={isSubmitting}
        className="h-full shrink-0 px-4 text-xs font-normal shadow-xs active:scale-98"
      >
        Apply
      </Button>
    </form>
  )
}

export default CouponInput
