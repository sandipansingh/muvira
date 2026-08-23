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
    if (!authLoading && !user) navigate(`/signin?returnTo=/orders/${id ?? ''}`, { replace: true })
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
        <div className="mx-auto max-w-xl rounded-3xl border border-border-light bg-neutral-50/60 p-10 text-center shadow-premium">
          <h1 className="heading text-3xl">Order unavailable</h1>
          <p className="mt-2 text-sm text-neutral-500">
            {error ?? 'We could not find this order.'}
          </p>
          <Link to="/orders" className="button-primary mt-6">
            Back to Orders
          </Link>
        </div>
      </main>
    )

  const trackingEvents = tracking?.shipment_events ?? []
  const trackingUrl = tracking?.tracking_url ?? order.trackingUrl

  return (
    <main className="editorial-page py-10 sm:py-16">
      <div className="editorial-container max-w-4xl space-y-10">
        <Link
          to="/orders"
          className="inline-flex items-center gap-1.5 text-xs font-semibold leading-none text-muted transition-colors hover:text-ink hover:underline"
        >
          <ArrowLeft className="h-4 w-4 shrink-0" />
          <span className="leading-none">Back to order history</span>
        </Link>
        <div className="flex flex-col justify-between gap-4 border-b border-border-light pb-6 sm:flex-row sm:items-end">
          <div>
            <span className="eyebrow mb-1 block">Order Details</span>
            <h1 className="heading text-4xl sm:text-6xl">#{order.orderNumber}</h1>
            <p className="mt-1 text-xs text-neutral-500">Placed on {formatDate(order.createdAt)}</p>
          </div>
          <span className="status-badge self-start sm:self-auto">
            {order.status.replaceAll('_', ' ')}
          </span>
        </div>

        <section className="panel space-y-5 p-6 sm:p-8">
          <div className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-foreground" />
            <h2 className="font-display text-xl font-bold text-[var(--color-ink)]">
              Shipment Tracking
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-4 text-xs sm:grid-cols-3">
            <div className="border-t border-[var(--color-line)] pt-3">
              <span className="block text-neutral-500">AWB tracking number</span>
              <strong className="mt-1 block text-sm text-foreground">
                {tracking?.awb_code ?? order.awbCode ?? 'Not assigned yet'}
              </strong>
            </div>
            <div className="border-t border-[var(--color-line)] pt-3">
              <span className="block text-neutral-500">Courier partner</span>
              <strong className="mt-1 block text-sm text-foreground">
                {tracking?.courier_name ?? order.courierName ?? 'Not assigned yet'}
              </strong>
            </div>
            <div className="border-t border-[var(--color-line)] pt-3">
              <span className="block text-neutral-500">Shipment status</span>
              <strong className="mt-1 block text-sm text-foreground">
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
              className="text-ink underline underline-offset-2 hover:underline text-xs inline-block"
            >
              Open carrier tracking
            </a>
          )}
          {trackingEvents.length > 0 && (
            <div className="space-y-4 border-t border-[var(--color-line)] pt-5">
              {trackingEvents.map((event) => (
                <div key={event.id} className="flex gap-3 text-xs">
                  <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-foreground" />
                  <div>
                    <p className="font-bold text-foreground">{event.status}</p>
                    <p className="text-neutral-500">
                      {formatDate(event.event_time)}
                      {event.location ? ` · ${event.location}` : ''}
                    </p>
                    {event.remarks && <p className="mt-1 text-neutral-500">{event.remarks}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="heading mb-5 text-2xl">Ordered Items</h2>
          <div className="divide-y divide-[var(--color-line)] border-y border-[var(--color-line)]">
            {order.items.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-4 py-4">
                <div className="flex min-w-0 items-center gap-4">
                  {item.productImage ? (
                    <img
                      src={item.productImage}
                      alt={item.productName}
                      className="h-16 w-16 rounded-2xl shrink-0 object-cover border border-neutral-100"
                    />
                  ) : (
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-neutral-100">
                      <Package className="h-6 w-6 text-neutral-300" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <h3 className="truncate font-display text-base font-bold text-foreground">
                      {item.productName}
                    </h3>
                    <p className="text-xs font-semibold text-neutral-500">Qty: {item.quantity}</p>
                  </div>
                </div>
                <span className="shrink-0 text-base font-bold text-foreground">
                  {formatPrice(item.totalPrice)}
                </span>
              </div>
            ))}
          </div>
        </section>

        <div className="grid grid-cols-1 gap-8 border-t border-border-light pt-8 sm:grid-cols-2">
          <div className="panel space-y-2 p-6 text-xs">
            <h2 className="mb-3 flex items-center gap-1.5 text-sm font-bold leading-none text-foreground">
              <MapPin className="h-4 w-4 shrink-0 text-foreground" />
              <span className="leading-none">Shipping Address</span>
            </h2>
            <p className="font-bold text-foreground">{order.shippingAddress.fullName}</p>
            <p className="text-neutral-600">
              {order.shippingAddress.line1}
              {order.shippingAddress.line2 ? `, ${order.shippingAddress.line2}` : ''}
            </p>
            <p className="text-neutral-600">
              {order.shippingAddress.city}, {order.shippingAddress.state}{' '}
              {order.shippingAddress.pincode} · {order.shippingAddress.phone}
            </p>
          </div>
          <div className="panel space-y-2 p-6 text-xs">
            <h2 className="mb-3 flex items-center gap-1.5 text-sm font-bold leading-none text-foreground">
              <ShieldCheck className="h-4 w-4 shrink-0 text-foreground" />
              <span className="leading-none">Payment Details</span>
            </h2>
            <p className="font-semibold text-foreground">Razorpay online payment</p>
            <p className="font-bold text-emerald-700">Status: {order.paymentStatus}</p>
            <div className="space-y-1.5 border-t border-border-light pt-3 text-neutral-600">
              <p className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-semibold text-foreground">{formatPrice(order.subtotal)}</span>
              </p>
              {order.discountAmount > 0 && (
                <p className="flex justify-between text-emerald-700 font-semibold">
                  <span>Discount</span>
                  <span>-{formatPrice(order.discountAmount)}</span>
                </p>
              )}
              <p className="flex justify-between">
                <span>Shipping</span>
                <span className="font-semibold text-foreground">
                  {order.shippingAmount ? formatPrice(order.shippingAmount) : 'FREE'}
                </span>
              </p>
              <p className="flex justify-between border-t border-border-light pt-2 font-bold text-foreground text-sm">
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

export default OrderDetailPage
