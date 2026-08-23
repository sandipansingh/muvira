import React from 'react'
import { ArrowRight, CheckCircle, Package, ShieldCheck } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'

export const OrderSuccessPage: React.FC = () => {
  const [searchParams] = useSearchParams()
  const orderId = searchParams.get('orderId')
  const orderNumber = searchParams.get('orderNumber')
  if (!orderId)
    return (
      <main className="editorial-page px-4 py-12 text-center">
        <h1 className="heading page-title">Order confirmation unavailable</h1>
        <Link to="/orders" className="button-primary mt-6">
          View orders
        </Link>
      </main>
    )
  return (
    <main className="editorial-page px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
      <div className="panel mx-auto max-w-2xl p-6 text-center sm:p-8">
        <CheckCircle className="mx-auto h-12 w-12 text-accent" />
        <span className="eyebrow mt-6 block text-accent">Payment Verified</span>
        <h1 className="heading page-title mt-2">Thank you for your order</h1>
        <p className="mt-3 text-sm font-normal text-ink-soft">
          Order reference: #{orderNumber ?? orderId}
        </p>
        <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-muted font-normal">
          Your payment has been verified. Follow the order status and shipment updates from your
          order details.
        </p>
        <div className="flex flex-col justify-center gap-3 pt-6 sm:flex-row">
          <Link
            to={`/orders/${encodeURIComponent(orderId)}`}
            className="button-primary py-3 text-sm"
          >
            <Package className="h-4 w-4 shrink-0" />
            <span className="leading-none">Track Order</span>
          </Link>
          <Link to="/shop" className="button-secondary py-3 text-sm">
            <span className="leading-none">Continue Shopping</span>
            <ArrowRight className="h-4 w-4 shrink-0" />
          </Link>
        </div>
        <p className="mt-8 flex items-center justify-center gap-2 border-t border-[var(--color-line)] pt-4 text-[11px] text-[var(--color-muted)]">
          <ShieldCheck className="h-4 w-4 shrink-0 text-ink" />
          <span className="leading-none">Secure Razorpay payment verification.</span>
        </p>
      </div>
    </main>
  )
}

export default OrderSuccessPage
