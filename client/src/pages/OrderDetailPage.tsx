import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { AccountShell } from '../components/auth/AccountShell'
import { CustomerPageHeading } from '../components/common/CustomerPageHeading'
import {
  OrderItems,
  OrderTotals,
  OrderAddressCard,
  OrderPaymentCard,
  InvoiceButton,
} from '../components/orders/OrderCards'
import { useCustomerOrder } from '../lib/hooks/useCustomerOrder'
import { Button } from '../components/ui/Button'
import { formatDate } from '../lib/utils/format'

function OrderWorkspace({ id, userId }: { id: string; userId: string }) {
  const { order, loading, error, retry, tracking, trackingLoading, trackingError } =
    useCustomerOrder(id, userId)
  return (
    <AccountShell>
      {loading ? (
        <>
          <CustomerPageHeading title="Your order" />
          <p role="status" className="journey-card">
            Loading your order…
          </p>
        </>
      ) : error || !order ? (
        <div className="journey-card">
          <CustomerPageHeading title="Order unavailable" />
          <p role="alert">{error || 'We could not find this order.'}</p>
          <Button onClick={retry} className="mt-4">
            Try again
          </Button>
          <Link to="/orders" className="account-text-link ml-4">
            Back to Orders
          </Link>
        </div>
      ) : (
        <>
          <CustomerPageHeading
            title={`#${order.orderNumber}`}
            description={`Placed on ${formatDate(order.createdAt)}`}
            breadcrumbs={[
              { label: 'Home', href: '/' },
              { label: 'Account', href: '/profile' },
              { label: 'Orders', href: '/orders' },
              { label: `#${order.orderNumber}` },
            ]}
          >
            <span className="neutral-badge">{order.status.replaceAll('_', ' ')}</span>
          </CustomerPageHeading>
          <div className="journey-stack">
            <section className="journey-card order-shipment-recap" aria-label="Shipment tracking">
              <div>
                <h2 className="journey-section-title">Shipment tracking</h2>
                <p className="mt-3 text-sm text-ink-soft">
                  {trackingLoading
                    ? 'Loading shipment updates…'
                    : trackingError
                      ? 'Shipment updates are temporarily unavailable.'
                      : tracking?.shiprocket_status ||
                        order.shiprocketStatus ||
                        'Carrier tracking events will appear here after the shipment is picked up.'}
                </p>
                {!trackingLoading && !trackingError && (
                  <p className="mt-2 text-sm text-ink-soft">
                    {tracking?.courier_name || order.courierName || 'Courier not assigned yet'}
                    {(tracking?.awb_code || order.awbCode) &&
                      ` · ${tracking?.awb_code || order.awbCode}`}
                  </p>
                )}
              </div>
              <Link
                to={`/orders/${encodeURIComponent(order.id)}/tracking`}
                className="button-primary"
              >
                Track order
              </Link>
            </section>
            <OrderItems order={order} />
            <div className="journey-two-cards">
              <OrderAddressCard address={order.shippingAddress} />
              <OrderPaymentCard order={order} />
            </div>
            {!order.billingSameAsShipping && (
              <OrderAddressCard address={order.billingAddress} title="Billing address" />
            )}
            <OrderTotals order={order} />
            <InvoiceButton order={order} />
          </div>
        </>
      )}
    </AccountShell>
  )
}
export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user, loading } = useAuth()
  if (loading || !user || !id) return <main className="editorial-page" />
  return <OrderWorkspace key={`${user.id}:${id}`} id={id} userId={user.id} />
}
