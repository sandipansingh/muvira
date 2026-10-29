import { useEffect, useId, useRef, useState } from 'react'
import { Download } from 'lucide-react'
import type { OrderAddress, OrderDetail } from '../../lib/types/order'
import { formatPrice } from '../../lib/utils/format'
import { orderApiService } from '../../lib/services/order.service'
import { StoreImage } from '../common/StoreImage'
import { Button } from '../ui/Button'

export function OrderItems({ order }: { order: OrderDetail }) {
  const titleId = useId()
  const count = order.items.reduce((total, item) => total + item.quantity, 0)
  return (
    <section className="journey-card" aria-labelledby={titleId}>
      <div className="journey-card-heading">
        <h2 id={titleId}>Order items</h2>
        <span className="text-sm text-muted">
          {count} {count === 1 ? 'item' : 'items'}
        </span>
      </div>
      <div className="order-items">
        {order.items.map((item) => (
          <div key={item.id} className="order-item">
            <StoreImage
              framing="square"
              fallbackPresentation="icon"
              src={item.productImage || undefined}
              alt={item.productName}
              width={192}
              height={192}
              className="order-item-image"
            />
            <div className="order-item-copy">
              <h3 className="font-product text-sm font-semibold">{item.productName}</h3>
              <p className="mt-2 text-sm text-ink-soft">
                Qty {item.quantity} · {formatPrice(item.unitPrice)} each
              </p>
            </div>
            <p className="font-product text-primary">{formatPrice(item.totalPrice)}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

export function OrderTotals({ order }: { order: OrderDetail }) {
  return (
    <section className="journey-card" aria-label="Order summary">
      <h2 className="journey-section-title mb-5">Order summary</h2>
      <dl className="journey-totals">
        <div>
          <dt>Subtotal</dt>
          <dd>{formatPrice(order.subtotal)}</dd>
        </div>
        {order.discountAmount > 0 && (
          <div>
            <dt>Discount{order.couponCode ? ` (${order.couponCode})` : ''}</dt>
            <dd>−{formatPrice(order.discountAmount)}</dd>
          </div>
        )}
        <div>
          <dt>Shipping</dt>
          <dd>{order.shippingAmount === 0 ? 'Free' : formatPrice(order.shippingAmount)}</dd>
        </div>
        {order.taxAmount > 0 && (
          <div>
            <dt>Tax</dt>
            <dd>{formatPrice(order.taxAmount)}</dd>
          </div>
        )}
        <div className="journey-total">
          <dt>Total</dt>
          <dd>{formatPrice(order.totalAmount)}</dd>
        </div>
      </dl>
    </section>
  )
}

export function OrderAddressCard({
  address,
  title = 'Shipping address',
}: {
  address: OrderAddress
  title?: string
}) {
  return (
    <section className="journey-card">
      <h2 className="journey-section-title mb-4">{title}</h2>
      <address className="not-italic space-y-1 text-sm leading-relaxed text-ink-soft">
        <p className="font-semibold text-ink">{address.fullName}</p>
        <p>{address.line1}</p>
        {address.line2 && <p>{address.line2}</p>}
        <p>
          {address.city}, {address.state} {address.pincode}
        </p>
        <p>{address.country}</p>
        <p className="pt-2">{address.phone}</p>
      </address>
    </section>
  )
}

export function OrderPaymentCard({ order }: { order: OrderDetail }) {
  return (
    <section className="journey-card">
      <h2 className="journey-section-title mb-4">Payment details</h2>
      <p className="text-sm text-ink">
        {order.paymentMethod
          ? order.paymentMethod === 'razorpay'
            ? 'Razorpay'
            : `Razorpay · ${order.paymentMethod}`
          : 'Online payment method not recorded'}
      </p>
      <p className="mt-3 text-sm text-ink-soft">
        Payment status:{' '}
        <span className="font-semibold capitalize text-ink">{order.paymentStatus}</span>
      </p>
      {order.billingGstin && <p className="mt-3 text-sm">GSTIN: {order.billingGstin}</p>}
    </section>
  )
}

export function InvoiceButton({
  order,
}: {
  order: Pick<OrderDetail, 'id' | 'orderNumber' | 'paymentStatus' | 'shiprocketOrderId'>
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const pending = useRef(false)
  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])
  if (order.paymentStatus !== 'paid') return null
  if (!order.shiprocketOrderId)
    return <p className="text-xs text-muted">Invoice available after fulfillment begins.</p>
  const download = async () => {
    if (pending.current) return
    pending.current = true
    setBusy(true)
    setError(null)
    try {
      const blob = await orderApiService.downloadInvoice(order.id)
      if (!mounted.current) return
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `invoice-${order.orderNumber}.pdf`
      anchor.click()
      URL.revokeObjectURL(url)
    } catch (reason) {
      if (mounted.current)
        setError(reason instanceof Error ? reason.message : 'Invoice could not be downloaded.')
    } finally {
      pending.current = false
      if (mounted.current) setBusy(false)
    }
  }
  return (
    <div>
      <Button
        variant="secondary"
        onClick={() => void download()}
        isLoading={busy}
        leftIcon={<Download className="h-4 w-4" />}
      >
        Download invoice
      </Button>
      {error && (
        <p role="alert" className="mt-2 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  )
}
