import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { Tag, HelpCircle, ArrowRight, CheckCircle, X, ChevronDown } from 'lucide-react'
import type { CartItem } from '../../lib/types/cart'
import { formatPrice } from '../../lib/utils/format'
import { useCart } from '../../context/CartContext'

export interface FlowCartSidebarProps {
  items: CartItem[]
  subtotalPaisa: number
  discountPaisa: number
  shippingPaisa: number
  totalPaisa: number
  onProceed: () => void
  isProcessing?: boolean
  buttonLabel?: string
  disabled?: boolean
  collapsibleOnMobile?: boolean
}

export const FlowCartSidebar: React.FC<FlowCartSidebarProps> = ({
  items,
  subtotalPaisa,
  discountPaisa,
  shippingPaisa,
  totalPaisa,
  onProceed,
  isProcessing = false,
  buttonLabel = 'Continue to Payment',
  disabled = false,
  collapsibleOnMobile = false,
}) => {
  const { coupon, applyCoupon, removeCoupon } = useCart()
  const [couponCode, setCouponCode] = useState('')
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false)
  const [isSummaryOpen, setIsSummaryOpen] = useState(false)

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = couponCode.trim().toUpperCase()
    if (!trimmed || isApplyingCoupon) return

    setIsApplyingCoupon(true)
    try {
      const ok = await applyCoupon(trimmed)
      if (ok) setCouponCode('')
    } finally {
      setIsApplyingCoupon(false)
    }
  }

  // Estimated tax (e.g. 0 or included in prices)
  const estimatedTaxPaisa = 0

  return (
    <aside className="rounded-3xl border border-[var(--color-line)] bg-[var(--color-paper)] p-5 sm:p-6 shadow-xs lg:sticky lg:top-24 lg:self-start space-y-5">
      {/* Title */}
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-lg sm:text-xl font-bold text-[var(--color-ink)]">
          Your Cart
        </h2>
        {collapsibleOnMobile && (
          <button
            type="button"
            onClick={() => setIsSummaryOpen((open) => !open)}
            className="inline-flex items-center gap-2 rounded-lg px-2 text-sm text-ink lg:hidden"
            aria-expanded={isSummaryOpen}
            aria-controls="checkout-cart-details"
          >
            {isSummaryOpen ? 'Hide' : 'Details'}
            <ChevronDown
              className={`h-4 w-4 transition-transform ${isSummaryOpen ? 'rotate-180' : ''}`}
            />
          </button>
        )}
      </div>

      <div
        id="checkout-cart-details"
        className={`space-y-5 ${collapsibleOnMobile && !isSummaryOpen ? 'hidden lg:block' : ''}`}
      >
        {/* Item List with Quantity Badges on Thumbnails */}
        <div className="max-h-72 space-y-3.5 overflow-y-auto dropdown-scrollbar pr-1">
          {items.map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-3 text-xs">
              <div className="flex min-w-0 items-center gap-3">
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)]">
                  {item.productImage ? (
                    <img
                      src={item.productImage}
                      alt={item.productName}
                      width={56}
                      height={56}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-[10px] text-[var(--color-muted)]">
                      No image
                    </div>
                  )}
                  {/* Quantity Badge on Top */}
                  <span className="absolute left-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-black/80 text-[10px] font-bold text-white shadow-xs">
                    {item.quantity}
                  </span>
                </div>

                <div className="min-w-0">
                  <Link
                    to={`/product/${item.productSlug}`}
                    className="line-clamp-2 font-display text-sm font-bold text-[var(--color-ink)] hover:text-[var(--color-primary)] transition-colors"
                  >
                    {item.productName}
                  </Link>
                  <p className="mt-0.5 text-[11px] text-[var(--color-muted)]">
                    ₹{(item.unitPrice / 100).toFixed(0)} each
                  </p>
                </div>
              </div>

              <span className="shrink-0 font-sans text-xs sm:text-sm font-bold text-[var(--color-ink)]">
                {formatPrice(item.lineTotal)}
              </span>
            </div>
          ))}
        </div>

        {/* Discount Code Input matching Reference #2 */}
        <div className="border-t border-[var(--color-line)] pt-4">
          {coupon ? (
            <div className="flex items-center justify-between rounded-xl border border-accent/30 bg-accent-soft p-2.5 text-xs text-accent">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 shrink-0 text-accent" />
                <span className="font-semibold uppercase tracking-wider text-[var(--color-ink)]">
                  {coupon.code}
                </span>
                <span className="text-accent">(-{formatPrice(coupon.discountAmount)})</span>
              </div>
              <button
                type="button"
                onClick={removeCoupon}
                aria-label="Remove coupon"
                className="flex h-5 w-5 cursor-pointer items-center justify-center rounded-full text-accent hover:bg-accent/20"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <form onSubmit={handleApplyCoupon} className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-[8rem] flex-1 h-11">
                <Tag className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-muted)]" />
                <input
                  type="text"
                  placeholder="Discount code"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  className="h-full w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] pl-9 pr-3 text-base text-[var(--color-ink)] placeholder:text-[var(--color-muted)] focus:border-[var(--color-primary)] focus:bg-[var(--color-paper)] focus:outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={isApplyingCoupon || !couponCode.trim()}
                className="h-11 cursor-pointer rounded-xl bg-[var(--color-ink)] px-4 text-sm font-semibold text-white transition-all hover:bg-[var(--color-primary)] disabled:opacity-40 disabled:hover:bg-[var(--color-ink)]"
              >
                {isApplyingCoupon ? '...' : 'Apply'}
              </button>
            </form>
          )}
        </div>

        {/* Financial Breakdown */}
        <div className="space-y-2.5 border-t border-[var(--color-line)] pt-4 text-sm text-[var(--color-muted)]">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span className="font-semibold text-[var(--color-ink)]">
              {formatPrice(subtotalPaisa)}
            </span>
          </div>

          {discountPaisa > 0 && (
            <div className="flex justify-between font-semibold text-accent">
              <span>Coupon Discount</span>
              <span>-{formatPrice(discountPaisa)}</span>
            </div>
          )}

          <div className="flex justify-between">
            <span>Shipping</span>
            <span className="font-semibold text-[var(--color-ink)]">
              {shippingPaisa === 0 ? (
                <span className="text-accent font-bold">FREE</span>
              ) : (
                formatPrice(shippingPaisa)
              )}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="flex items-center gap-1">
              Estimated taxes
              <HelpCircle className="h-3 w-3 text-[var(--color-muted)]" />
            </span>
            <span className="font-semibold text-[var(--color-ink)]">
              {estimatedTaxPaisa === 0 ? 'Included' : formatPrice(estimatedTaxPaisa)}
            </span>
          </div>

          <div className="flex justify-between border-t border-[var(--color-line)] pt-3 text-base font-bold text-[var(--color-ink)]">
            <span>Total</span>
            <span className="font-sans text-xl font-bold text-[var(--color-ink)]">
              {formatPrice(totalPaisa)}
            </span>
          </div>
        </div>
      </div>

      {/* Primary CTA Button */}
      <button
        type="button"
        onClick={onProceed}
        disabled={disabled || isProcessing || items.length === 0}
        className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[var(--color-ink)] py-3.5 text-sm font-semibold text-white shadow-xs transition-all hover:bg-[var(--color-primary)] hover:shadow-sm disabled:opacity-50"
      >
        <span>{isProcessing ? 'Processing...' : buttonLabel}</span>
        {!isProcessing && <ArrowRight className="h-4 w-4 shrink-0" />}
      </button>
    </aside>
  )
}

export default FlowCartSidebar
