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
        <h1 className="editorial-heading text-3xl">Order confirmation unavailable</h1>
        <Link to="/orders" className="editorial-button mt-6">
          View orders
        </Link>
      </main>
    )
  return (
    <main className="editorial-page px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl border-y border-line py-8 text-center sm:py-12">
        <CheckCircle className="mx-auto h-12 w-12 text-success" />
        <p className="editorial-label mt-6">Payment verified</p>
        <h1 className="editorial-heading mt-3 text-4xl">Thank you for your order</h1>
        <p className="mt-3 text-sm font-medium text-muted-ink">
          Order reference: #{orderNumber ?? orderId}
        </p>
        <p className="mx-auto mt-6 max-w-md text-sm leading-7 text-muted-ink">
          Your payment has been verified. Follow the order status and shipment updates from your
          order details.
        </p>
        <div className="flex flex-col justify-center gap-3 pt-8 sm:flex-row">
          <Link to={`/orders/${encodeURIComponent(orderId)}`} className="editorial-button">
            <Package className="h-4 w-4" /> Track order
          </Link>
          <Link to="/shop" className="editorial-button-secondary">
            Continue shopping <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <p className="mt-8 flex items-center justify-center gap-2 border-t border-line pt-4 text-[11px] text-muted-ink">
          <ShieldCheck className="h-4 w-4 text-ink" /> Secure Razorpay payment.
        </p>
      </div>
    </main>
  )
}
