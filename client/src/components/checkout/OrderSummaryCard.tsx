import React from 'react'
import { ShieldCheck } from 'lucide-react'
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
  return (
    <aside className="space-y-6 rounded-3xl border border-border-light bg-neutral-50/60 p-6 sm:p-8 lg:sticky lg:top-28">
      <h2 className="border-b border-border-light pb-4 font-display text-xl font-bold text-foreground">
        Order Summary
      </h2>
      <div className="max-h-60 space-y-3 overflow-y-auto dropdown-scrollbar">
        {items.map((item) => (
          <div key={item.id} className="flex items-center justify-between gap-3 text-xs">
            <div className="flex min-w-0 items-center gap-3">
              {item.productImage ? (
                <img
                  src={item.productImage}
                  alt={item.productName}
                  className="h-12 w-12 rounded-xl shrink-0 object-cover border border-neutral-100"
                />
              ) : (
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-neutral-100 text-[10px] text-neutral-400">
                  No image
                </div>
              )}
              <div className="min-w-0">
                <p className="truncate font-semibold text-foreground">{item.productName}</p>
                <p className="text-neutral-500">Qty: {item.quantity}</p>
              </div>
            </div>
            <span className="shrink-0 font-semibold text-foreground">
              {formatPrice(item.unitPrice * item.quantity)}
            </span>
          </div>
        ))}
      </div>
      <div className="border-t border-border-light pt-4">
        <CouponInput />
      </div>
      <div className="space-y-2 border-t border-border-light pt-4 text-xs text-neutral-600">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span className="font-semibold text-foreground">{formatPrice(subtotalPaisa)}</span>
        </div>
        {discountPaisa > 0 && (
          <div className="flex justify-between font-semibold text-emerald-700">
            <span>Discount ({coupon?.code})</span>
            <span>-{formatPrice(discountPaisa)}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span>Shipping</span>
          <span className="font-semibold text-foreground">
            {shippingPaisa === 0 ? 'FREE' : formatPrice(shippingPaisa)}
          </span>
        </div>
        <div className="flex justify-between border-t border-border-light pt-4 text-lg font-bold text-foreground">
          <span>Total</span>
          <span>{formatPrice(totalPaisa)}</span>
        </div>
      </div>
      <button
        type="button"
        onClick={onPlaceOrder}
        disabled={isProcessing || items.length === 0}
        className="editorial-button w-full py-3.5 text-sm font-bold"
      >
        {isProcessing ? 'Processing payment...' : `Place order — ${formatPrice(totalPaisa)}`}
      </button>
      <p className="flex items-center justify-center gap-2 text-[11px] leading-4 text-neutral-500">
        <ShieldCheck className="h-4 w-4 text-foreground shrink-0" /> Secure payments via Razorpay.
      </p>
    </aside>
  )
}

export default OrderSummaryCard
