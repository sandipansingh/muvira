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
    <aside className="space-y-6 border-y border-line py-6 sm:py-8 lg:sticky lg:top-28">
      <h2 className="border-b border-line pb-4 font-serif text-2xl font-bold text-ink">
        Order summary
      </h2>
      <div className="max-h-60 space-y-3 overflow-y-auto">
        {items.map((item) => (
          <div key={item.id} className="flex items-center justify-between gap-3 text-xs">
            <div className="flex min-w-0 items-center gap-3">
              {item.productImage ? (
                <img
                  src={item.productImage}
                  alt={item.productName}
                  className="h-12 w-12 shrink-0 object-cover"
                />
              ) : (
                <div className="flex h-12 w-12 shrink-0 items-center justify-center bg-surface text-[10px] text-muted-ink">
                  No image
                </div>
              )}
              <div className="min-w-0">
                <p className="truncate font-semibold text-ink">{item.productName}</p>
                <p className="text-muted-ink">Qty: {item.quantity}</p>
              </div>
            </div>
            <span className="shrink-0 font-semibold text-ink">
              {formatPrice(item.unitPrice * item.quantity)}
            </span>
          </div>
        ))}
      </div>
      <div className="border-t border-line pt-4">
        <CouponInput />
      </div>
      <div className="space-y-2 border-t border-line pt-4 text-xs text-muted-ink">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span className="font-semibold text-ink">{formatPrice(subtotalPaisa)}</span>
        </div>
        {discountPaisa > 0 && (
          <div className="flex justify-between font-semibold text-success">
            <span>Discount ({coupon?.code})</span>
            <span>-{formatPrice(discountPaisa)}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span>Shipping</span>
          <span className="font-semibold text-ink">
            {shippingPaisa === 0 ? 'FREE' : formatPrice(shippingPaisa)}
          </span>
        </div>
        <div className="flex justify-between border-t border-line pt-4 text-lg font-bold text-ink">
          <span>Total</span>
          <span>{formatPrice(totalPaisa)}</span>
        </div>
      </div>
      <button
        type="button"
        onClick={onPlaceOrder}
        disabled={isProcessing || items.length === 0}
        className="editorial-button w-full"
      >
        {isProcessing ? 'Processing payment...' : `Place order — ${formatPrice(totalPaisa)}`}
      </button>
      <p className="flex items-center justify-center gap-2 text-[11px] leading-4 text-muted-ink">
        <ShieldCheck className="h-4 w-4 text-ink" /> Final totals are confirmed by the server via
        Razorpay.
      </p>
    </aside>
  )
}
