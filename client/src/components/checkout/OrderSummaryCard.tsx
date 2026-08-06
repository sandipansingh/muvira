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
  const estimatedTaxPaisa = Math.round(subtotalPaisa * 0.18)

  return (
    <div className="bg-[#F6F4EF] p-6 sm:p-8 rounded-3xl border border-zinc-200/80 space-y-6 sticky top-28">
      <h3 className="font-serif text-xl font-bold text-zinc-900 border-b border-zinc-200 pb-4">
        Order Summary
      </h3>

      {/* Items list preview */}
      <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
        {items.map((item) => (
          <div key={item.id} className="flex items-center justify-between text-xs gap-3">
            <div className="flex items-center gap-3">
              <img
                src={
                  item.productImage || 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc'
                }
                alt={item.productName}
                className="w-12 h-12 rounded-lg object-cover bg-white border border-zinc-200"
              />
              <div>
                <p className="font-bold text-zinc-900 line-clamp-1">{item.productName}</p>
                <p className="text-zinc-500">Qty: {item.quantity}</p>
              </div>
            </div>
            <span className="font-bold text-zinc-900">
              {formatPrice(item.unitPrice * item.quantity)}
            </span>
          </div>
        ))}
      </div>

      {/* Promo Code Input */}
      <div className="pt-2 border-t border-zinc-200">
        <CouponInput />
      </div>

      {/* Price breakdown */}
      <div className="space-y-2 text-xs text-zinc-600 pt-2 border-t border-zinc-200">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span className="font-semibold text-zinc-900">{formatPrice(subtotalPaisa)}</span>
        </div>

        {discountPaisa > 0 && (
          <div className="flex justify-between text-emerald-700 font-semibold">
            <span>Discount ({coupon?.code})</span>
            <span>-{formatPrice(discountPaisa)}</span>
          </div>
        )}

        <div className="flex justify-between">
          <span>Shipping</span>
          <span className="font-semibold text-zinc-900">
            {shippingPaisa === 0 ? 'FREE' : formatPrice(shippingPaisa)}
          </span>
        </div>

        <div className="flex justify-between">
          <span>Estimated GST (18%)</span>
          <span className="font-semibold text-zinc-900">{formatPrice(estimatedTaxPaisa)}</span>
        </div>

        <div className="flex justify-between pt-4 border-t border-zinc-300 font-bold text-xl text-zinc-900">
          <span>Total</span>
          <span className="text-[#C88D35]">{formatPrice(totalPaisa)}</span>
        </div>
      </div>

      {/* Place Order CTA Button */}
      <button
        onClick={onPlaceOrder}
        disabled={isProcessing || items.length === 0}
        className="w-full py-4 bg-[#C88D35] hover:bg-[#B27B2A] text-white font-semibold text-sm rounded-xl transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {isProcessing ? 'Processing Payment...' : `Place Order — ${formatPrice(totalPaisa)}`}
      </button>

      <div className="flex items-center justify-center gap-2 text-[11px] text-zinc-500 pt-2">
        <ShieldCheck className="w-4 h-4 text-[#C88D35]" />
        <span>256-bit encrypted, PCI-compliant payment via Razorpay</span>
      </div>
    </div>
  )
}
