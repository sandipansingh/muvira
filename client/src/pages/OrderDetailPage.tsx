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
      <main className="editorial-page px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-xl rounded-3xl border border-line bg-surface p-6 text-center shadow-premium">
          <h1 className="heading page-title">Order unavailable</h1>
          <p className="mt-2 text-sm text-muted">{error ?? 'We could not find this order.'}</p>
          <Link to="/orders" className="button-primary mt-6">
            Back to Orders
          </Link>
        </div>
      </main>
    )

  const trackingEvents = tracking?.shipment_events ?? []
  const trackingUrl = tracking?.tracking_url ?? order.trackingUrl

  return (
    <main className="editorial-page py-8 sm:py-10">
      <div className="editorial-container max-w-4xl space-y-8">
        <Link
          to="/orders"
          className="inline-flex items-center gap-1.5 text-xs font-normal leading-none text-muted transition-colors hover:text-primary hover:underline"
        >
          <ArrowLeft className="h-4 w-4 shrink-0" />
          <span className="leading-none">Back to order history</span>
        </Link>
        <div className="flex flex-col justify-between gap-4 border-b border-line pb-6 sm:flex-row sm:items-end">
          <div>
            <span className="eyebrow mb-1 block">Order Details</span>
            <h1 className="heading page-title">#{order.orderNumber}</h1>
            <p className="mt-1 text-xs text-muted">Placed on {formatDate(order.createdAt)}</p>
          </div>
          <span className="status-badge self-start sm:self-auto">
            {order.status.replaceAll('_', ' ')}
          </span>
        </div>

        <section className="panel space-y-4 p-5 sm:p-6">
          <div className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-ink" />
            <h2 className="font-display text-lg font-normal text-[var(--color-ink)]">
              Shipment Tracking
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-4 text-xs sm:grid-cols-3">
            <div className="border-t border-[var(--color-line)] pt-3">
              <span className="block text-muted">AWB tracking number</span>
              <strong className="mt-1 block text-sm text-ink">
                {tracking?.awb_code ?? order.awbCode ?? 'Not assigned yet'}
              </strong>
            </div>
            <div className="border-t border-[var(--color-line)] pt-3">
              <span className="block text-muted">Courier partner</span>
              <strong className="mt-1 block text-sm text-ink">
                {tracking?.courier_name ?? order.courierName ?? 'Not assigned yet'}
              </strong>
            </div>
            <div className="border-t border-[var(--color-line)] pt-3">
              <span className="block text-muted">Shipment status</span>
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
              className="text-ink underline underline-offset-2 hover:underline text-xs inline-block"
            >
              Open carrier tracking
            </a>
          )}
          {trackingEvents.length > 0 && (
            <div className="space-y-4 border-t border-[var(--color-line)] pt-5">
              {trackingEvents.map((event) => (
                <div key={event.id} className="flex gap-3 text-xs">
                  <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-ink" />
                  <div>
                    <p className="font-normal text-ink">{event.status}</p>
                    <p className="text-muted">
                      {formatDate(event.event_time)}
                      {event.location ? ` · ${event.location}` : ''}
                    </p>
                    {event.remarks && <p className="mt-1 text-muted">{event.remarks}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="heading mb-4 text-xl">Ordered Items</h2>
          <div className="divide-y divide-[var(--color-line)] border-y border-[var(--color-line)]">
            {order.items.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-4 py-4">
                <div className="flex min-w-0 items-center gap-4">
                  {item.productImage ? (
                    <img
                      src={item.productImage}
                      alt={item.productName}
                      className="h-16 w-16 rounded-2xl shrink-0 object-cover border border-line"
                    />
                  ) : (
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-surface">
                      <Package className="h-6 w-6 text-disabled" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <h3 className="truncate font-display text-base font-normal text-ink">
                      {item.productName}
                    </h3>
                    <p className="text-xs font-normal text-muted">Qty: {item.quantity}</p>
                  </div>
                </div>
                <span className="shrink-0 text-base font-normal text-ink">
                  {formatPrice(item.totalPrice)}
                </span>
              </div>
            ))}
          </div>
        </section>

        <div className="grid grid-cols-1 gap-6 border-t border-line pt-6 sm:grid-cols-2">
          <div className="panel space-y-2 p-5 text-xs">
            <h2 className="mb-3 flex items-center gap-1.5 text-sm font-normal leading-none text-ink">
              <MapPin className="h-4 w-4 shrink-0 text-ink" />
              <span className="leading-none">Shipping Address</span>
            </h2>
            <p className="font-normal text-ink">{order.shippingAddress.fullName}</p>
            <p className="text-ink-soft">
              {order.shippingAddress.line1}
              {order.shippingAddress.line2 ? `, ${order.shippingAddress.line2}` : ''}
            </p>
            <p className="text-ink-soft">
              {order.shippingAddress.city}, {order.shippingAddress.state}{' '}
              {order.shippingAddress.pincode} · {order.shippingAddress.phone}
            </p>
          </div>
          <div className="panel space-y-2 p-5 text-xs">
            <h2 className="mb-3 flex items-center gap-1.5 text-sm font-normal leading-none text-ink">
              <ShieldCheck className="h-4 w-4 shrink-0 text-ink" />
              <span className="leading-none">Payment Details</span>
            </h2>
            <p className="font-normal text-ink">Razorpay online payment</p>
            <p className="font-normal text-accent">Status: {order.paymentStatus}</p>
            <div className="space-y-1.5 border-t border-line pt-3 text-ink-soft">
              <p className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-normal text-ink">{formatPrice(order.subtotal)}</span>
              </p>
              {order.discountAmount > 0 && (
                <p className="flex justify-between text-accent font-normal">
                  <span>Discount</span>
                  <span>-{formatPrice(order.discountAmount)}</span>
                </p>
              )}
              <p className="flex justify-between">
                <span>Shipping</span>
                <span className="font-normal text-ink">
                  {order.shippingAmount ? formatPrice(order.shippingAmount) : 'FREE'}
                </span>
              </p>
              <p className="flex justify-between border-t border-line pt-2 font-normal text-ink text-sm">
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
