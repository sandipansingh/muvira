import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { Link } from 'react-router-dom'
import type { Address } from '../../lib/types/cart'
import type { OrderListItem } from '../../lib/types/order'
import { orderApiService } from '../../lib/services/order.service'
import { formatDate, formatPrice } from '../../lib/utils/format'
import { StoreImage } from '../common/StoreImage'
import { Button } from '../ui/Button'

interface AccountOverviewProps {
  addresses: Address[]
  loadingAddresses: boolean
  addressError: string | null
  retryAddresses: () => void
}

export function AccountOverview({
  addresses,
  loadingAddresses,
  addressError,
  retryAddresses,
}: AccountOverviewProps) {
  const { user } = useAuth()
  const [order, setOrder] = useState<OrderListItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retry, setRetry] = useState(0)
  const defaultAddress = addresses.find((address) => address.isDefault)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)
    const load = async () => {
      try {
        const response = await orderApiService.getOrders(1, 1)
        if (!response.success) throw new Error(response.error.message)
        if (active) setOrder(response.data[0] ?? null)
      } catch (reason) {
        if (active)
          setError(reason instanceof Error ? reason.message : 'Unable to load your recent order.')
      } finally {
        if (active) setLoading(false)
      }
    }
    void load()
    return () => {
      active = false
    }
  }, [retry])

  return (
    <>
      <div className="account-previews">
        <section className="account-card account-preview" aria-labelledby="recent-order-title">
          <div className="account-card__heading">
            <h2 id="recent-order-title">Recent order</h2>
            <Link to="/orders" className="account-text-link">
              All orders
            </Link>
          </div>
          {loading ? (
            <p role="status" className="account-preview__message">
              Loading your recent order…
            </p>
          ) : error ? (
            <div className="account-preview__message">
              <p role="alert" className="text-danger">
                {error}
              </p>
              <Button
                variant="secondary"
                className="mt-4"
                onClick={() => setRetry((value) => value + 1)}
              >
                Try again
              </Button>
            </div>
          ) : order ? (
            <div className="account-recent-order">
              <StoreImage
                framing="square"
                fallbackPresentation="icon"
                src={order.firstItemImage}
                alt={order.firstItemName ?? 'Ordered product'}
                width={128}
                height={128}
                className="account-recent-order__image"
              />
              <div className="account-recent-order__details">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">#{order.orderNumber}</span>
                  <span className="neutral-badge">{order.status.replaceAll('_', ' ')}</span>
                </div>
                {order.firstItemName && <p className="font-product">{order.firstItemName}</p>}
                <p className="text-sm text-ink-soft">Placed on {formatDate(order.createdAt)}</p>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                  <span className="text-sm text-ink-soft">
                    {order.itemCount} {order.itemCount === 1 ? 'item' : 'items'}
                  </span>
                  <span className="font-product text-primary">
                    {formatPrice(order.totalAmount)}
                  </span>
                </div>
                <div className="flex flex-wrap gap-x-5">
                  <Link to={`/orders/${order.id}`} className="account-text-link">
                    View order
                  </Link>
                  <Link to={`/orders/${order.id}/tracking`} className="account-text-link">
                    Track order
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <div className="account-preview__message">
              <p>No orders yet.</p>
              <p className="mt-2 text-sm text-ink-soft">
                Your next meaningful piece will appear here.
              </p>
              <Link to="/shop" className="account-text-link mt-3">
                Explore the shop
              </Link>
            </div>
          )}
        </section>
        <section className="account-card account-preview" aria-labelledby="default-address-title">
          <div className="account-card__heading">
            <h2 id="default-address-title">Default address</h2>
            <Link to="/profile#addresses" className="account-text-link">
              Manage
            </Link>
          </div>
          {loadingAddresses ? (
            <p role="status" className="account-preview__message">
              Loading your address…
            </p>
          ) : addressError ? (
            <div className="account-preview__message">
              <p role="alert" className="text-danger">
                {addressError}
              </p>
              <Button variant="secondary" className="mt-4" onClick={retryAddresses}>
                Try again
              </Button>
            </div>
          ) : defaultAddress ? (
            <address className="account-default-address not-italic">
              <strong>{defaultAddress.fullName}</strong>
              <p>{defaultAddress.line1}</p>
              {defaultAddress.line2 && <p>{defaultAddress.line2}</p>}
              <p>
                {defaultAddress.city}, {defaultAddress.state} {defaultAddress.pincode}
              </p>
              <p>{defaultAddress.country}</p>
              <p className="mt-2">{defaultAddress.phone}</p>
            </address>
          ) : (
            <div className="account-preview__message">
              <p>No default address yet.</p>
              <Link to="/profile#addresses" className="account-text-link mt-3">
                {addresses.length ? 'Choose a default address' : 'Add an address'}
              </Link>
            </div>
          )}
        </section>
      </div>
      <section className="account-card account-personal-preview" aria-label="Personal information">
        <div>
          <h2 className="journey-section-title">Personal info</h2>
          <p className="mt-3 text-sm text-ink-soft">
            {user?.fullName || 'Add your name'} · {user?.email}
          </p>
          <p className="mt-1 text-sm text-ink-soft">
            {user?.phone || 'Add a phone number in your personal details.'}
          </p>
        </div>
        <Link to="/profile#personal-info" className="button-secondary">
          Edit details
        </Link>
      </section>
    </>
  )
}
