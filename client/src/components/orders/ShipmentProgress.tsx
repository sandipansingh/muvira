import { Check, Package, Truck, MapPin, CircleCheck } from 'lucide-react'
import type { OrderDetail, OrderTrackingData, OrderStatus } from '../../lib/types/order'
import { Button } from '../ui/Button'

const stages = [
  { title: 'Placed', icon: Package },
  { title: 'Preparing', icon: Package },
  { title: 'Shipped', icon: Truck },
  { title: 'Out for delivery', icon: MapPin },
  { title: 'Delivered', icon: CircleCheck },
]
const normalStage: Partial<Record<OrderStatus, number>> = {
  pending: 0,
  confirmed: 0,
  processing: 1,
  shipped: 2,
  out_for_delivery: 3,
  delivered: 4,
}
const exceptions: Partial<Record<OrderStatus, string>> = {
  cancelled: 'Cancelled',
  rto: 'Returning to origin',
  returned: 'Returned',
  refunded: 'Refunded',
  lost: 'Shipment lost',
  damaged: 'Shipment damaged',
  delivery_failed: 'Delivery failed',
}
function eventDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? 'Time unavailable'
    : new Intl.DateTimeFormat('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Kolkata',
      }).format(date) + ' IST'
}
export function ShipmentProgress({ order }: { order: OrderDetail }) {
  const current = normalStage[order.status]
  if (current === undefined)
    return (
      <div className="journey-card shipment-exception" role="alert">
        <p className="font-semibold">
          {exceptions[order.status] || order.status.replaceAll('_', ' ')}
        </p>
        <p className="mt-2 text-sm text-ink-soft">
          The latest order status is shown above. Available shipment updates appear below.
        </p>
      </div>
    )
  return (
    <section className="journey-card" aria-label="Delivery progress">
      <h2 className="journey-section-title">Delivery progress</h2>
      {order.paymentStatus === 'pending' && (
        <p className="mt-2 text-sm text-ink-soft">Payment confirmation is pending.</p>
      )}
      <ol className="shipment-progress">
        {stages.map(({ title, icon: Icon }, index) => (
          <li
            key={title}
            data-complete={index < current}
            data-current={index === current}
            aria-current={index === current ? 'step' : undefined}
          >
            <span className="shipment-progress-marker" aria-hidden="true">
              {index < current ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
            </span>
            <span>
              {title}
              <span className="sr-only">
                {index < current
                  ? ', completed'
                  : index === current
                    ? ', current stage'
                    : ', upcoming'}
              </span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  )
}
export function ShipmentUpdates({
  order,
  tracking,
  loading,
  error,
  retry,
}: {
  order: OrderDetail
  tracking: OrderTrackingData | null
  loading: boolean
  error: string | null
  retry: () => void
}) {
  const events = [...(tracking?.shipment_events || [])].sort(
    (a, b) => new Date(b.event_time).getTime() - new Date(a.event_time).getTime()
  )
  const trackingUrl = tracking?.tracking_url || order.trackingUrl
  return (
    <>
      <section className="journey-card" aria-label="Tracking information">
        <h2 className="journey-section-title mb-5">Tracking information</h2>
        {loading ? (
          <p role="status" className="text-sm">
            Loading shipment updates…
          </p>
        ) : error ? (
          <div>
            <p role="alert" className="text-sm text-danger">
              Tracking could not be loaded: {error}
            </p>
            <Button variant="secondary" className="mt-4" onClick={retry}>
              Retry tracking
            </Button>
          </div>
        ) : (
          <>
            <dl className="shipment-facts">
              <div>
                <dt>Courier partner</dt>
                <dd>{tracking?.courier_name || order.courierName || 'Not assigned yet'}</dd>
              </div>
              <div>
                <dt>AWB tracking number</dt>
                <dd>{tracking?.awb_code || order.awbCode || 'Not assigned yet'}</dd>
              </div>
              <div>
                <dt>Shipment status</dt>
                <dd>
                  {tracking?.shiprocket_status ||
                    order.shiprocketStatus ||
                    order.status.replaceAll('_', ' ')}
                </dd>
              </div>
            </dl>
            {trackingUrl && (
              <a
                href={trackingUrl}
                target="_blank"
                rel="noreferrer"
                className="account-text-link mt-3"
              >
                Open carrier tracking
              </a>
            )}
          </>
        )}
      </section>
      {!loading && !error && (
        <section className="journey-card" aria-label="Order timeline">
          <h2 className="journey-section-title mb-5">Order timeline</h2>
          {events.length ? (
            <ol className="shipment-events">
              {events.map((event) => (
                <li key={event.id}>
                  <span className="shipment-event-dot" aria-hidden="true" />
                  <div>
                    <p className="font-semibold">{event.status}</p>
                    <p className="mt-1 text-sm text-ink-soft">
                      <time dateTime={event.event_time}>{eventDate(event.event_time)}</time>
                      {event.location && ` · ${event.location}`}
                    </p>
                    {event.remarks && <p className="mt-2 text-sm text-ink-soft">{event.remarks}</p>}
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-ink-soft">
              Carrier tracking events will appear here after the shipment is picked up.
            </p>
          )}
        </section>
      )}
    </>
  )
}
