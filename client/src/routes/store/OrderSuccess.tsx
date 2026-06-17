import React, { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { formatPrice, formatDate } from '../../lib/format'
import Button from '../../components/ui/Button'
import { ordersApiService } from '../../lib/api/orders'
import type { OrderDetail } from '../../types/order'
import { ShoppingBag, ClipboardList, MapPin, CreditCard, ShieldCheck, Package } from 'lucide-react'
import Skeleton from '../../components/ui/Skeleton'
import OrderStatusTracker from '../../components/shared/OrderStatusTracker'

export const OrderSuccess: React.FC = () => {
  const location = useLocation()
  const navigate = useNavigate()

  const [order, setOrder] = useState<OrderDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Retrieve initial details passed from checkout routing (fallback values)
  const orderNumberFromState = location.state?.orderNumber
  const totalAmountFromState = location.state?.totalAmount
  const orderIdFromState = location.state?.orderId

  useEffect(() => {
    const fetchOrder = async () => {
      setLoading(true)
      setError(null)

      let finalOrderId = orderIdFromState

      // If no orderId is passed in state, look up user's latest order to support page refresh
      if (!finalOrderId) {
        try {
          const listRes = await ordersApiService.getOrders(1, 1)
          if (listRes.success && listRes.data && listRes.data.length > 0) {
            finalOrderId = listRes.data[0].id
          }
        } catch (err) {
          console.error('Error checking latest orders:', err)
        }
      }

      if (finalOrderId) {
        const res = await ordersApiService.getOrderById(finalOrderId)
        if (res.success) {
          setOrder(res.data)
        } else {
          console.error('Failed to load order details:', res.error.message)
          // If we couldn't load details but have location state, we can fallback to it
          if (!orderNumberFromState) {
            setError(res.error.message || 'Failed to retrieve order details.')
          }
        }
      } else {
        // No orderId in state and no orders in account history
        if (!orderNumberFromState) {
          setError('No recent order found in your account.')
        }
      }
      setLoading(false)
    }

    fetchOrder()
  }, [orderIdFromState, orderNumberFromState])

  // If loading and we have no state fallback, show a skeleton layout
  if (loading && !orderNumberFromState) {
    return (
      <div className="min-h-[85vh] relative flex items-center justify-center py-16 px-6 overflow-hidden">
        <div className="pattern-block absolute inset-0 pointer-events-none" />
        <div className="w-full max-w-6xl relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-12">
          <div className="lg:col-span-7 space-y-8 animate-pulse">
            <div className="flex flex-col items-center text-center space-y-4">
              <Skeleton className="w-20 h-20 rounded-full bg-secondary300/40" />
              <Skeleton className="h-8 w-64 rounded bg-secondary300/40" />
              <Skeleton className="h-4 w-96 rounded bg-secondary300/40" />
            </div>
            <div className="space-y-6 pt-6">
              <Skeleton className="h-5 w-32 rounded bg-secondary300/40" />
              <div className="relative pl-10 space-y-8">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex gap-4">
                    <Skeleton className="w-6 h-6 rounded-full shrink-0 bg-secondary300/40" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-40 rounded bg-secondary300/40" />
                      <Skeleton className="h-3 w-60 rounded bg-secondary300/40" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="lg:col-span-5 animate-pulse">
            <div className="border border-secondary200 rounded-xl p-6 space-y-6 bg-white/50">
              <Skeleton className="h-6 w-40 rounded bg-secondary300/40" />
              <div className="space-y-4">
                {[1, 2].map((i) => (
                  <div key={i} className="flex gap-4">
                    <Skeleton className="w-14 h-14 rounded bg-secondary300/40 shrink-0" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-32 rounded bg-secondary300/40" />
                      <Skeleton className="h-3 w-16 rounded bg-secondary300/40" />
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t border-secondary200 pt-4 space-y-3">
                <Skeleton className="h-4 w-full rounded bg-secondary300/40" />
                <Skeleton className="h-4 w-full rounded bg-secondary300/40" />
                <Skeleton className="h-6 w-full rounded bg-secondary300/40" />
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error && !orderNumberFromState) {
    return (
      <div className="min-h-[75vh] relative flex flex-col items-center justify-center px-6 text-center">
        <div className="pattern-block absolute inset-0 pointer-events-none" />
        <div className="relative z-10 max-w-md mx-auto space-y-6">
          <div className="w-16 h-16 rounded-full bg-secondary200 flex items-center justify-center mx-auto text-secondary600">
            <Package className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-redhatMedium font-bold text-darkColor">
            Unable to load details
          </h1>
          <p className="text-sm text-secondary500 leading-relaxed">
            {error}. Don't worry, if your payment was processed, your order is secure. Check your
            email for confirmation.
          </p>
          <div className="pt-2 flex flex-col sm:flex-row gap-3">
            <Button variant="outline" onClick={() => navigate('/orders')} className="w-full">
              My Orders
            </Button>
            <Button variant="primary" onClick={() => navigate('/products')} className="w-full">
              Continue Shopping
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Use values from fetched order, fallback to state values, fallback to dummy
  const orderNumber = order?.orderNumber || orderNumberFromState || 'MUV-XXXXXX'
  const totalAmount = order?.totalAmount || totalAmountFromState || 0
  const status = order?.status || 'confirmed'

  return (
    <div className="min-h-[85vh] relative py-12 md:py-20 px-6 overflow-hidden bg-transparent">
      {/* Heritage grid pattern background */}
      <div className="pattern-block absolute inset-0 pointer-events-none" />

      <style>{`
        @keyframes scalePop {
          0% { transform: scale(0.6); opacity: 0; }
          70% { transform: scale(1.06); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes drawCheck {
          0% { stroke-dashoffset: 24; }
          100% { stroke-dashoffset: 0; }
        }
        .animate-scale-pop {
          animation: scalePop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
      `}</style>

      <div className="max-w-6xl mx-auto relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-start">
          {/* LEFT COLUMN: Success Hero & Milestone Timeline */}
          <div className="lg:col-span-7 space-y-10 animate-stagger stagger-1 text-left">
            {/* Success Header */}
            <div className="space-y-4">
              <div className="relative flex items-center justify-center w-20 h-20 mb-6">
                {/* Rotating decorative dashed circle */}
                <svg
                  className="absolute w-full h-full animate-[spin_20s_linear_infinite] text-[var(--accent-gold)]"
                  viewBox="0 0 100 100"
                >
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeDasharray="5,4"
                    fill="none"
                  />
                </svg>
                {/* Solid inner circle */}
                <div className="w-16 h-16 rounded-full border border-[var(--accent-gold)]/30 flex items-center justify-center bg-[var(--surface)] shadow-md animate-scale-pop">
                  <svg
                    className="w-8 h-8 text-[var(--accent)]"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeDasharray="24"
                      strokeDashoffset="24"
                      className="animate-[drawCheck_0.5s_ease-out_0.2s_forwards]"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
              </div>

              <h1 className="text-3xl md:text-4xl font-redhatMedium font-bold text-darkColor leading-tight">
                Your Order is Confirmed
              </h1>
              <p className="text-sm md:text-base text-secondary500 leading-relaxed max-w-xl">
                Thank you for your purchase. We have received your order and are already preparing
                to handcraft your pieces. A detailed summary has been sent to your email.
              </p>
            </div>

            {/* Delivery Milestone Tracker */}
            <div className="space-y-6 pt-4 border-t border-[#e6dfd5]">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-secondary600">
                Delivery Milestones
              </h3>

              <OrderStatusTracker status={status} />
            </div>

            {/* Navigation Actions */}
            <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-[#e6dfd5]">
              <Button
                variant="outline"
                onClick={() => navigate('/orders')}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 text-xs md:text-sm px-8 py-3"
              >
                <ClipboardList className="w-4 h-4 shrink-0" />
                Go to My Orders
              </Button>
              <Button
                variant="primary"
                onClick={() => navigate('/products')}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 text-xs md:text-sm px-8 py-3"
              >
                <ShoppingBag className="w-4 h-4 shrink-0" />
                Continue Shopping
              </Button>
            </div>
          </div>

          {/* RIGHT COLUMN: Detailed Craft Receipt Card */}
          <div className="lg:col-span-5 animate-stagger stagger-2">
            <div className="bg-[#f4ede3]/40 border border-[#e6dfd5] rounded-xl overflow-hidden shadow-sm p-6 space-y-6 text-left">
              {/* Receipt Header */}
              <div className="pb-4 border-b border-[#e6dfd5] flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-redhatMedium font-bold text-darkColor">Receipt</h3>
                  <p className="text-xs text-secondary500 mt-0.5">Reference: {orderNumber}</p>
                </div>
                {order?.createdAt && (
                  <span className="text-right text-[10px] text-secondary500 uppercase tracking-wider">
                    {formatDate(order.createdAt)}
                  </span>
                )}
              </div>

              {/* Items List */}
              <div className="space-y-4">
                {order && order.items && order.items.length > 0 ? (
                  order.items.map((item) => (
                    <div key={item.id} className="flex gap-4 items-center justify-between">
                      <div className="flex gap-3 items-center">
                        <div className="w-14 h-14 rounded-lg bg-[var(--surface-2)] border border-[#e6dfd5] overflow-hidden shrink-0 flex items-center justify-center">
                          {item.productImage ? (
                            <img
                              src={item.productImage}
                              alt={item.productName}
                              className="w-full h-full object-cover transition-opacity duration-300"
                              onError={(e) => {
                                // Graceful image error handler
                                ;(e.target as HTMLImageElement).src =
                                  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100" height="100" fill="%23f4ede3"/><text x="50" y="55" font-family="serif" font-size="10" fill="%23a59a8c" text-anchor="middle">Heritage</text></svg>'
                              }}
                            />
                          ) : (
                            <Package className="w-6 h-6 text-secondary400" />
                          )}
                        </div>
                        <div className="space-y-0.5">
                          <h4 className="text-xs font-semibold text-darkColor line-clamp-1 leading-snug">
                            {item.productName}
                          </h4>
                          <p className="text-[11px] text-secondary500">
                            Qty: {item.quantity} × {formatPrice(item.unitPrice)}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-darkColor">
                        {formatPrice(item.totalPrice)}
                      </span>
                    </div>
                  ))
                ) : (
                  // Fallback simple list
                  <div className="py-2 flex items-center gap-3">
                    <Package className="w-8 h-8 text-[var(--accent-gold)]" />
                    <p className="text-xs text-secondary500">
                      Your handcrafted items are listed under reference {orderNumber}.
                    </p>
                  </div>
                )}
              </div>

              {/* Price Calculation Breakdown */}
              <div className="border-t border-[#e6dfd5] pt-4 space-y-2.5 text-xs">
                {order ? (
                  <>
                    <div className="flex justify-between text-secondary600">
                      <span>Subtotal</span>
                      <span>{formatPrice(order.subtotal)}</span>
                    </div>
                    {order.discountAmount > 0 && (
                      <div className="flex justify-between text-successColor font-medium">
                        <span>Coupon Discount ({order.couponCode})</span>
                        <span>-{formatPrice(order.discountAmount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-secondary600">
                      <span>Shipping</span>
                      <span>
                        {order.shippingAmount > 0 ? formatPrice(order.shippingAmount) : 'Free'}
                      </span>
                    </div>
                  </>
                ) : totalAmount > 0 ? (
                  <div className="flex justify-between text-secondary600">
                    <span>Subtotal</span>
                    <span>{formatPrice(totalAmount)}</span>
                  </div>
                ) : null}

                {/* Total */}
                <div className="flex justify-between items-center text-sm font-bold text-darkColor border-t border-[#e6dfd5]/60 pt-3">
                  <span className="font-redhatMedium text-base">Grand Total</span>
                  <span className="text-base text-[var(--accent)]">{formatPrice(totalAmount)}</span>
                </div>
              </div>

              {/* Delivery Address & Payment Method */}
              <div className="border-t border-[#e6dfd5] pt-4 space-y-4">
                {/* Shipping Details */}
                {order && order.shippingAddress ? (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-secondary600">
                      <MapPin className="w-3.5 h-3.5 text-[var(--accent-gold)] shrink-0" />
                      <span>Delivery Address</span>
                    </div>
                    <div className="text-[11px] text-secondary500 pl-5 leading-relaxed">
                      <p className="font-semibold text-darkColor">
                        {order.shippingAddress.fullName}
                      </p>
                      <p>{order.shippingAddress.line1}</p>
                      {order.shippingAddress.line2 && <p>{order.shippingAddress.line2}</p>}
                      <p>
                        {order.shippingAddress.city}, {order.shippingAddress.state} -{' '}
                        {order.shippingAddress.pincode}
                      </p>
                      <p className="text-secondary400 mt-0.5">
                        Phone: {order.shippingAddress.phone}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-xs text-secondary500">
                    <MapPin className="w-4 h-4 text-secondary400 shrink-0" />
                    <span>Shipping and invoice sent to your profile address.</span>
                  </div>
                )}

                {/* Payment confirmation badge */}
                <div className="bg-transparent border border-[#e6dfd5]/60 rounded-md p-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <CreditCard className="w-4 h-4 text-[var(--accent-gold)] shrink-0" />
                    <span className="text-xs font-medium text-secondary600">Payment Method</span>
                  </div>
                  <span className="border border-[var(--accent-gold)]/30 bg-[#faf6ef] text-[var(--accent-gold)] text-[9px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5" /> Razorpay Verified
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default OrderSuccess
