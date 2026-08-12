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
        <h1 className="font-display text-2xl font-bold text-foreground">
          Order confirmation unavailable
        </h1>
        <Link to="/orders" className="editorial-button mt-6">
          View orders
        </Link>
      </main>
    )
  return (
    <main className="editorial-page px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl rounded-3xl border border-border-light bg-neutral-50/60 p-8 text-center sm:p-12 shadow-premium">
        <CheckCircle className="mx-auto h-12 w-12 text-emerald-600" />
        <span className="text-xs font-bold uppercase tracking-widest text-emerald-700 mt-6 block">
          Payment Verified
        </span>
        <h1 className="font-display mt-2 text-3xl sm:text-4xl font-bold text-foreground">
          Thank you for your order
        </h1>
        <p className="mt-3 text-sm font-semibold text-neutral-700">
          Order reference: #{orderNumber ?? orderId}
        </p>
        <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-neutral-500 font-normal">
          Your payment has been verified. Follow the order status and shipment updates from your
          order details.
        </p>
        <div className="flex flex-col justify-center gap-3 pt-8 sm:flex-row">
          <Link
            to={`/orders/${encodeURIComponent(orderId)}`}
            className="editorial-button py-3 font-bold text-sm"
          >
            <Package className="h-4 w-4" /> Track Order
          </Link>
          <Link to="/shop" className="editorial-button-secondary py-3 font-bold text-sm">
            Continue Shopping <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <p className="mt-8 flex items-center justify-center gap-2 border-t border-border-light pt-4 text-[11px] text-neutral-400">
          <ShieldCheck className="h-4 w-4 text-foreground" /> Secure Razorpay payment verification.
        </p>
      </div>
    </main>
  )
}

export default OrderSuccessPage
