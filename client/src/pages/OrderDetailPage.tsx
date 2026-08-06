import React, { useEffect, useState } from 'react'
import { ArrowLeft, MapPin, Package, ShieldCheck, Truck } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { orderApiService } from '../lib/services/order.service'
import type { OrderDetail, OrderTrackingData } from '../lib/types/order'
import { formatDate, formatPrice } from '../lib/utils/format'

export const OrderDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [order, setOrder] = useState<OrderDetail | null>(null)
  const [tracking, setTracking] = useState<OrderTrackingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!authLoading && !user) navigate(`/login?returnTo=/orders/${id ?? ''}`, { replace: true })
  }, [authLoading, id, navigate, user])

  useEffect(() => {
    if (!user || !id) return
    let active = true
    const loadOrder = async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await orderApiService.getOrderById(id)
        if (!response.success) throw new Error(response.error.message)
        if (active) setOrder(response.data)
      } catch (reason) {
        if (active) {
          setError(reason instanceof Error ? reason.message : 'Unable to load this order.')
          setOrder(null)
          setLoading(false)
        }
        return
      }
      try {
        const response = await orderApiService.getOrderTracking(id)
        if (active && response.success) setTracking(response.data)
      } catch {
        if (active) setTracking(null)
      } finally {
        if (active) setLoading(false)
      }
    }
    void loadOrder()
    return () => {
      active = false
    }
  }, [id, user])

  if (authLoading || !user || loading) return <main className="editorial-page" />
  if (error || !order)
    return (
      <main className="editorial-page px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-xl border border-line bg-ivory p-10 text-center">
          <h1 className="editorial-heading text-3xl">Order unavailable</h1>
          <p className="mt-2 text-sm text-muted-ink">{error ?? 'We could not find this order.'}</p>
          <Link to="/orders" className="editorial-button mt-6">
            Back to orders
          </Link>
        </div>
      </main>
    )

  const trackingEvents = tracking?.shipment_events ?? []
  const trackingUrl = tracking?.tracking_url ?? order.trackingUrl

  return (
    <main className="editorial-page py-12 sm:py-16">
      <div className="editorial-container max-w-4xl space-y-10">
        <Link
          to="/orders"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-ink hover:text-cognac"
        >
          <ArrowLeft className="h-4 w-4" /> Back to order history
        </Link>
        <div className="flex flex-col justify-between gap-4 border-b border-line pb-6 sm:flex-row sm:items-end">
          <div>
            <p className="editorial-label">Order details</p>
            <h1 className="editorial-heading mt-3 text-4xl">#{order.orderNumber}</h1>
            <p className="mt-2 text-xs text-muted-ink">Placed on {formatDate(order.createdAt)}</p>
          </div>
          <span className="self-start text-xs font-semibold uppercase tracking-wide text-cognac sm:self-auto">
            {order.status.replaceAll('_', ' ')}
          </span>
        </div>

        <section className="space-y-5 border-y border-line bg-ivory p-6 sm:p-8">
          <div className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-cognac" />
            <h2 className="font-serif text-2xl font-bold text-ink">Shipment tracking</h2>
          </div>
          <div className="grid grid-cols-1 gap-4 text-xs sm:grid-cols-3">
            <div className="border-t border-line pt-3">
              <span className="block text-muted-ink">AWB tracking number</span>
              <strong className="mt-1 block text-sm text-ink">
                {tracking?.awb_code ?? order.awbCode ?? 'Not assigned yet'}
              </strong>
            </div>
            <div className="border-t border-line pt-3">
              <span className="block text-muted-ink">Courier partner</span>
              <strong className="mt-1 block text-sm text-ink">
                {tracking?.courier_name ?? order.courierName ?? 'Not assigned yet'}
              </strong>
            </div>
            <div className="border-t border-line pt-3">
              <span className="block text-muted-ink">Shipment status</span>
              <strong className="mt-1 block text-sm text-ink">
                {tracking?.shiprocket_status ??
                  order.shiprocketStatus ??
                  order.status.replaceAll('_', ' ')}
              </strong>
            </div>
          </div>
          {trackingUrl && (
            <a
              href={trackingUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex text-xs font-semibold text-cognac hover:text-ink"
            >
              Open carrier tracking
            </a>
          )}
          {trackingEvents.length > 0 && (
            <div className="space-y-4 border-t border-line pt-5">
              {trackingEvents.map((event) => (
                <div key={event.id} className="flex gap-3 text-xs">
                  <div className="mt-1 h-2 w-2 shrink-0 bg-cognac" />
                  <div>
                    <p className="font-semibold text-ink">{event.status}</p>
                    <p className="text-muted-ink">
                      {formatDate(event.event_time)}
                      {event.location ? ` · ${event.location}` : ''}
                    </p>
                    {event.remarks && <p className="mt-1 text-muted-ink">{event.remarks}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-5 font-serif text-2xl font-bold text-ink">Ordered items</h2>
          <div className="divide-y divide-line border-y border-line">
            {order.items.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-4 py-4">
                <div className="flex min-w-0 items-center gap-4">
                  {item.productImage ? (
                    <img
                      src={item.productImage}
                      alt={item.productName}
                      className="h-16 w-16 shrink-0 object-cover"
                    />
                  ) : (
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center bg-ivory">
                      <Package className="h-6 w-6 text-line" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <h3 className="truncate font-serif text-base font-bold text-ink">
                      {item.productName}
                    </h3>
                    <p className="text-xs font-semibold text-muted-ink">Qty: {item.quantity}</p>
                  </div>
                </div>
                <span className="shrink-0 text-base font-bold text-ink">
                  {formatPrice(item.totalPrice)}
                </span>
              </div>
            ))}
          </div>
        </section>

        <div className="grid grid-cols-1 gap-8 border-t border-line pt-8 sm:grid-cols-2">
          <div className="space-y-2 text-xs">
            <h2 className="flex items-center gap-1.5 text-sm font-bold text-ink">
              <MapPin className="h-4 w-4 text-cognac" /> Shipping address
            </h2>
            <p className="font-medium text-ink">{order.shippingAddress.fullName}</p>
            <p className="text-muted-ink">
              {order.shippingAddress.line1}
              {order.shippingAddress.line2 ? `, ${order.shippingAddress.line2}` : ''}
            </p>
            <p className="text-muted-ink">
              {order.shippingAddress.city}, {order.shippingAddress.state}{' '}
              {order.shippingAddress.pincode} · {order.shippingAddress.phone}
            </p>
          </div>
          <div className="space-y-2 text-xs">
            <h2 className="flex items-center gap-1.5 text-sm font-bold text-ink">
              <ShieldCheck className="h-4 w-4 text-cognac" /> Payment details
            </h2>
            <p className="font-medium text-ink">Razorpay online payment</p>
            <p className="font-semibold text-success">Payment status: {order.paymentStatus}</p>
            <div className="space-y-1 border-t border-line pt-3 text-muted-ink">
              <p className="flex justify-between">
                <span>Subtotal</span>
                <span>{formatPrice(order.subtotal)}</span>
              </p>
              {order.discountAmount > 0 && (
                <p className="flex justify-between">
                  <span>Discount</span>
                  <span>-{formatPrice(order.discountAmount)}</span>
                </p>
              )}
              <p className="flex justify-between">
                <span>Shipping</span>
                <span>{order.shippingAmount ? formatPrice(order.shippingAmount) : 'FREE'}</span>
              </p>
              <p className="flex justify-between border-t border-line pt-2 font-bold text-ink">
                <span>Total</span>
                <span>{formatPrice(order.totalAmount)}</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
