import { useEffect, useRef, useState } from 'react'
import { Package } from 'lucide-react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { orderApiService } from '../../lib/services/order.service'
import type { OrderListItem, OrderListView } from '../../lib/types/order'
import { formatDate, formatPrice } from '../../lib/utils/format'
import { Pagination } from '../common/Pagination'
import { StoreImage } from '../common/StoreImage'
import { Button } from '../ui/Button'
import { InvoiceButton } from './OrderCards'

const views: { value: OrderListView; label: string; empty: string }[] = [
  { value: 'current', label: 'Current', empty: 'You have no current orders.' },
  { value: 'unpaid', label: 'Unpaid', empty: 'You have no unpaid orders.' },
  { value: 'all', label: 'All orders', empty: 'You have not placed any orders yet.' },
]

function OrderHistoryCard({ order }: { order: OrderListItem }) {
  const address = order.shippingAddress
  return (
    <article className="order-history-card journey-card" aria-label={`Order ${order.orderNumber}`}>
      <header className="order-history-heading">
        <div>
          <h2 className="font-sans text-sm font-semibold">Order #{order.orderNumber}</h2>
          <p className="mt-1 text-xs text-muted">
            {order.itemCount} {order.itemCount === 1 ? 'item' : 'items'}
            {' · '}Placed on {formatDate(order.createdAt)}
          </p>
        </div>
        <div className="order-history-invoice">
          <InvoiceButton order={order} />
        </div>
      </header>
      <dl className="order-history-facts">
        <div>
          <dt>Status</dt>
          <dd className="capitalize">{order.status.replaceAll('_', ' ')}</dd>
        </div>
        <div>
          <dt>Payment</dt>
          <dd className="capitalize">{order.paymentStatus}</dd>
        </div>
        {address.line1 && (
          <div>
            <dt>Ship to</dt>
            <dd>
              <address className="not-italic">
                {[
                  address.fullName,
                  address.line1,
                  address.line2,
                  address.city,
                  address.state,
                  address.pincode,
                  address.country,
                ]
                  .filter(Boolean)
                  .join(', ')}
              </address>
            </dd>
          </div>
        )}
        <div>
          <dt className="font-semibold text-ink">Total</dt>
          <dd className="font-product font-semibold text-primary">
            {formatPrice(order.totalAmount)}
          </dd>
        </div>
      </dl>
      <ul className="order-history-products" aria-label="Purchased products">
        {order.items.map((item) => (
          <li key={item.id} className="order-history-product">
            <StoreImage
              framing="square"
              fallbackPresentation="icon"
              src={item.productImage || undefined}
              alt={item.productName}
              width={160}
              height={160}
              className="order-history-image"
            />
            <div>
              <h3 className="font-product text-sm">{item.productName}</h3>
              <p className="mt-1 text-xs text-muted">
                Qty {item.quantity} · {formatPrice(item.unitPrice)} each
              </p>
            </div>
          </li>
        ))}
      </ul>
      <footer className="order-history-actions">
        <Link to={`/orders/${order.id}`} className="button-secondary">
          View order
        </Link>
        <Link to={`/orders/${order.id}/tracking`} className="account-text-link">
          Track order
        </Link>
      </footer>
    </article>
  )
}

export function OrderListPanel({ userId }: { userId: string }) {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { pathname, search, hash } = useLocation()
  const selected = views.find(({ value }) => value === params.get('view')) ?? views[0]
  const view = selected.value
  const rawPage = Number(params.get('page') ?? 1)
  const page = Number.isSafeInteger(rawPage) && rawPage > 0 ? rawPage : 1
  const [retry, setRetry] = useState(0)
  const requestKey = `${userId}:${view}:${page}:${retry}`
  const [result, setResult] = useState<{
    key: string
    orders: OrderListItem[]
    totalPages: number
    total: number
    error: string | null
  } | null>(null)
  const loading = result?.key !== requestKey
  const resultsRef = useRef<HTMLElement>(null)
  const previousPage = useRef({ page, view })
  const pageHref = (nextPage: number, nextView = view) => {
    const next = new URLSearchParams(search)
    next.set('view', nextView)
    next.set('page', String(nextPage))
    return { pathname, search: `?${next}`, hash }
  }

  useEffect(() => {
    if (previousPage.current.page !== page || previousPage.current.view !== view) {
      resultsRef.current?.scrollIntoView({
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
          ? 'instant'
          : 'smooth',
        block: 'start',
      })
    }
    previousPage.current = { page, view }
  }, [page, view])

  useEffect(() => {
    let active = true
    const load = async () => {
      try {
        const response = await orderApiService.getOrders(page, 20, view)
        if (!response.success) throw new Error(response.error.message)
        if (active)
          setResult({
            key: requestKey,
            orders: response.data,
            total: response.pagination.total,
            totalPages: response.pagination.totalPages,
            error: null,
          })
      } catch (reason) {
        if (active)
          setResult({
            key: requestKey,
            orders: [],
            total: 0,
            totalPages: 0,
            error: reason instanceof Error ? reason.message : 'Unable to load orders.',
          })
      }
    }
    void load()
    return () => {
      active = false
    }
  }, [page, view, requestKey])

  useEffect(() => {
    if (loading || !result || result.error) return
    const lastPage = Math.max(1, result.totalPages)
    if (page > lastPage) {
      const next = new URLSearchParams(search)
      next.set('page', String(lastPage))
      navigate({ pathname, search: `?${next}`, hash }, { replace: true, preventScrollReset: true })
    }
  }, [loading, result, page, pathname, search, hash, navigate])

  return (
    <section ref={resultsRef} className="account-results" aria-label="My orders">
      <div className="order-list-toolbar">
        <div className="order-list-views" role="group" aria-label="Filter orders">
          {views.map(({ value, label }) => (
            <button
              type="button"
              key={value}
              aria-pressed={view === value}
              onClick={() => {
                if (view !== value) navigate(pageHref(1, value), { preventScrollReset: true })
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <p role="status" className="order-list-count">
          {!loading && result && !result.error
            ? `${result.total} ${result.total === 1 ? 'order' : 'orders'}`
            : ''}
        </p>
      </div>
      {loading ? (
        <div className="journey-card order-list-message" role="status">
          Loading your orders…
        </div>
      ) : result?.error ? (
        <div className="journey-card order-list-message">
          <p role="alert" className="text-danger">
            {result.error}
          </p>
          <Button className="mt-5" onClick={() => setRetry((value) => value + 1)}>
            Try again
          </Button>
        </div>
      ) : result?.orders.length === 0 ? (
        <div className="journey-card order-list-message text-center">
          <Package className="mx-auto h-8 w-8 text-muted" aria-hidden="true" />
          <p className="mt-4">{selected.empty}</p>
          {view === 'all' ? (
            <Link to="/shop" className="button-primary mt-5">
              Explore Shop
            </Link>
          ) : (
            <Button
              className="mt-5"
              variant="secondary"
              onClick={() => navigate(pageHref(1, 'all'))}
            >
              View all orders
            </Button>
          )}
        </div>
      ) : (
        <div className="journey-stack">
          {result?.orders.map((order) => (
            <OrderHistoryCard key={order.id} order={order} />
          ))}
        </div>
      )}
      {!loading && result && !result.error && result.totalPages > 1 && (
        <div className="mt-8">
          <Pagination
            currentPage={page}
            totalPages={result.totalPages}
            onPageChange={(nextPage) => navigate(pageHref(nextPage), { preventScrollReset: true })}
            getPageHref={(nextPage) => {
              const href = pageHref(nextPage)
              return `${href.pathname}${href.search}${href.hash}`
            }}
          />
        </div>
      )}
    </section>
  )
}
