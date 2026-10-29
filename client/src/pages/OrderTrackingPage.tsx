import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { AccountShell } from '../components/auth/AccountShell'
import { CustomerPageHeading } from '../components/common/CustomerPageHeading'
import {
  OrderItems,
  OrderAddressCard,
  OrderPaymentCard,
  InvoiceButton,
} from '../components/orders/OrderCards'
import { ShipmentProgress, ShipmentUpdates } from '../components/orders/ShipmentProgress'
import { useCustomerOrder } from '../lib/hooks/useCustomerOrder'
import { Button } from '../components/ui/Button'
import { formatDate } from '../lib/utils/format'

function TrackingWorkspace({ id, userId }: { id: string; userId: string }) {
  const data = useCustomerOrder(id, userId)
  const { order } = data
  return (
    <AccountShell>
      <CustomerPageHeading
        title="Track your order"
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Account', href: '/profile' },
          { label: 'Orders', href: '/orders' },
          { label: 'Tracking' },
        ]}
      />
      {data.loading ? (
        <p role="status" className="journey-card">
          Loading your order…
        </p>
      ) : data.error || !order ? (
        <div className="journey-card">
          <p role="alert">{data.error || 'Order unavailable.'}</p>
          <Button className="mt-4" onClick={data.retry}>
            Try again
          </Button>
        </div>
      ) : (
        <div className="journey-stack">
          <section className="journey-card order-heading-card">
            <div>
              <h2 className="font-sans text-lg font-semibold">#{order.orderNumber}</h2>
              <p className="mt-2 text-sm text-ink-soft">Placed on {formatDate(order.createdAt)}</p>
            </div>
            <InvoiceButton order={order} />
          </section>
          <ShipmentProgress order={order} />
          <ShipmentUpdates
            order={order}
            tracking={data.tracking}
            loading={data.trackingLoading}
            error={data.trackingError}
            retry={data.retryTracking}
          />
          <OrderItems order={order} />
          <div className="journey-two-cards">
            <OrderAddressCard address={order.shippingAddress} />
            <OrderPaymentCard order={order} />
          </div>
          <Link
            to={`/orders/${encodeURIComponent(order.id)}`}
            className="button-secondary justify-self-start"
          >
            View order details
          </Link>
        </div>
      )}
    </AccountShell>
  )
}
export default function OrderTrackingPage() {
  const { id } = useParams<{ id: string }>()
  const { user, loading } = useAuth()
  if (loading || !user || !id) return <main className="editorial-page" />
  return <TrackingWorkspace key={`${user.id}:${id}`} id={id} userId={user.id} />
}
