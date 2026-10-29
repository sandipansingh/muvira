import { useEffect, useState } from 'react'
import { MapPin, Package, User } from 'lucide-react'
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
      <nav className="account-shortcuts" aria-label="Account shortcuts">
        {[
          {
            href: '/orders',
            title: 'My orders',
            description: 'Track deliveries and view your order history.',
            icon: Package,
          },
          {
            href: '/profile#personal-info',
            title: 'Personal info',
            description: 'Update your details and email preferences.',
            icon: User,
          },
          {
            href: '/profile#addresses',
            title: 'Saved addresses',
            description: 'Manage the places your pieces call home.',
            icon: MapPin,
          },
        ].map(({ href, title, description, icon: Icon }) => (
          <Link key={href} to={href} aria-label={title} className="account-card account-shortcut">
            <Icon className="h-6 w-6" aria-hidden="true" />
            <span className="account-shortcut__title">{title}</span>
            <span className="text-sm text-ink-soft">{description}</span>
          </Link>
        ))}
      </nav>
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
                <Link to={`/orders/${order.id}`} className="account-text-link justify-self-start">
                  View order
                </Link>
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
    </>
  )
}
