import React from 'react'
import { Lock, ShieldCheck } from 'lucide-react'
import type { CartItem } from '../../lib/types/cart'
import { formatPrice } from '../../lib/utils/format'
import { CouponInput } from '../cart/CouponInput'
import { useCart } from '../../context/CartContext'

interface OrderSummaryCardProps {
  items: CartItem[]
  subtotalPaisa: number
  discountPaisa: number
  shippingPaisa: number
  totalPaisa: number
  onPlaceOrder: () => void
  isProcessing: boolean
}

export const OrderSummaryCard: React.FC<OrderSummaryCardProps> = ({
  items,
  subtotalPaisa,
  discountPaisa,
  shippingPaisa,
  totalPaisa,
  onPlaceOrder,
  isProcessing,
}) => {
  const { coupon } = useCart()
  const totalItemCount = items.reduce((total, item) => total + item.quantity, 0)

  return (
    <aside className="panel space-y-6 p-6 sm:p-8 lg:sticky lg:top-28">
      <div className="flex items-center justify-between border-b border-[var(--color-line)] pb-4">
        <h2 className="font-display text-xl font-bold text-[var(--color-ink)]">Order Summary</h2>
        <span className="rounded-[var(--radius-control)] bg-[var(--color-surface)] px-2.5 py-0.5 text-xs font-bold text-[var(--color-ink)]">
          {totalItemCount} {totalItemCount === 1 ? 'item' : 'items'}
        </span>
      </div>

      <div className="max-h-64 space-y-3.5 overflow-y-auto dropdown-scrollbar pr-1">
        {items.map((item) => (
          <div key={item.id} className="flex items-center justify-between gap-3 text-xs">
            <div className="flex min-w-0 items-center gap-3">
              {item.productImage ? (
                <img
                  src={item.productImage}
                  alt={item.productName}
                  className="h-12 w-12 shrink-0 rounded-xl border border-[var(--color-line)] object-cover"
                />
              ) : (
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-surface text-xs text-muted">
                  No image
                </div>
              )}
              <div className="min-w-0">
                <p className="truncate font-semibold text-[var(--color-ink)]">{item.productName}</p>
                <p className="text-[var(--color-muted)]">Qty: {item.quantity}</p>
              </div>
            </div>
            <span className="shrink-0 font-bold text-[var(--color-ink)]">
              {formatPrice(item.unitPrice * item.quantity)}
            </span>
          </div>
        ))}
      </div>

      <div className="border-t border-[var(--color-line)] pt-4">
        <label className="mb-2 block text-xs font-semibold text-[var(--color-ink)]">
          Have a coupon?
        </label>
        <CouponInput />
      </div>

      <div className="space-y-2.5 border-t border-[var(--color-line)] pt-4 text-xs font-medium text-[var(--color-muted)]">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span className="font-bold text-[var(--color-ink)]">{formatPrice(subtotalPaisa)}</span>
        </div>
        {discountPaisa > 0 && (
          <div className="flex justify-between font-bold text-emerald-700">
            <span>Coupon Discount ({coupon?.code})</span>
            <span>-{formatPrice(discountPaisa)}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span>Delivery Charges</span>
          <span className="font-bold text-[var(--color-ink)]">
            {shippingPaisa === 0 ? (
              <span className="text-emerald-700 font-bold">FREE</span>
            ) : (
              formatPrice(shippingPaisa)
            )}
          </span>
        </div>
        <div className="flex justify-between border-t border-[var(--color-line)] pt-3 text-base font-bold text-[var(--color-ink)]">
          <span>Total Amount</span>
          <span className="font-display text-lg">{formatPrice(totalPaisa)}</span>
        </div>
      </div>

      <button
        type="button"
        onClick={onPlaceOrder}
        disabled={isProcessing || items.length === 0}
        className="button-primary w-full py-3.5 text-sm font-bold shadow-xs hover:shadow-sm"
      >
        <Lock className="h-4 w-4 shrink-0" />
        <span className="leading-none">
          {isProcessing ? 'Processing payment...' : `Pay ${formatPrice(totalPaisa)}`}
        </span>
      </button>

      <div className="flex items-center justify-center gap-1.5 text-xs font-medium text-[var(--color-muted)]">
        <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600" />
        <span className="leading-none">Guaranteed 256-bit SSL encrypted payment</span>
      </div>
    </aside>
  )
}

export default OrderSummaryCard
