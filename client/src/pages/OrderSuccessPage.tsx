import React from 'react'
import { ArrowRight, CheckCircle, Package, ShieldCheck } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'

export const OrderSuccessPage: React.FC = () => {
  const [searchParams] = useSearchParams()
  const orderId = searchParams.get('orderId')
  const orderNumber = searchParams.get('orderNumber')
  if (!orderId)
    return (
      <main className="editorial-page px-4 py-20 text-center">
        <h1 className="kit-heading text-2xl">Order confirmation unavailable</h1>
        <Link to="/orders" className="kit-button mt-6">
          View orders
        </Link>
      </main>
    )
  return (
    <main className="editorial-page px-4 py-16 sm:px-6 lg:px-8">
      <div className="kit-panel mx-auto max-w-2xl p-8 text-center sm:p-12">
        <CheckCircle className="mx-auto h-12 w-12 text-emerald-600" />
        <span className="kit-eyebrow mt-6 block text-emerald-700">Payment Verified</span>
        <h1 className="kit-heading mt-2 text-4xl sm:text-6xl">Thank you for your order</h1>
        <p className="mt-3 text-sm font-semibold text-neutral-700">
          Order reference: #{orderNumber ?? orderId}
        </p>
        <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-neutral-500 font-normal">
          Your payment has been verified. Follow the order status and shipment updates from your
          order details.
        </p>
        <div className="flex flex-col justify-center gap-3 pt-8 sm:flex-row">
          <Link to={`/orders/${encodeURIComponent(orderId)}`} className="kit-button py-3 text-sm">
            <Package className="h-4 w-4 shrink-0" />
            <span className="leading-none">Track Order</span>
          </Link>
          <Link to="/shop" className="kit-button-secondary py-3 text-sm">
            <span className="leading-none">Continue Shopping</span>
            <ArrowRight className="h-4 w-4 shrink-0" />
          </Link>
        </div>
        <p className="mt-8 flex items-center justify-center gap-2 border-t border-[var(--kit-line)] pt-4 text-[11px] text-[var(--kit-muted)]">
          <ShieldCheck className="h-4 w-4 shrink-0 text-foreground" />
          <span className="leading-none">Secure Razorpay payment verification.</span>
        </p>
      </div>
    </main>
  )
}

export default OrderSuccessPage
