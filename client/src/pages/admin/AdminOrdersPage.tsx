import React, { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Breadcrumbs } from '../../components/common/Breadcrumbs'
import { Pagination } from '../../components/common/Pagination'
import { Dropdown } from '../../components/ui/Dropdown'
import { adminApiService } from '../../lib/services/admin/admin.service'
import type { AdminOrderSummary } from '../../lib/types/order'
import { formatDate, formatPrice } from '../../lib/utils/format'

const statusOptions = [
  { value: '', label: 'All statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'processing', label: 'Processing' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'out_for_delivery', label: 'Out for delivery' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'rto', label: 'RTO' },
  { value: 'returned', label: 'Returned' },
  { value: 'refunded', label: 'Refunded' },
  { value: 'lost', label: 'Lost' },
  { value: 'damaged', label: 'Damaged' },
  { value: 'delivery_failed', label: 'Delivery failed' },
] as const

export const AdminOrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<AdminOrderSummary[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const resultsContainerRef = useRef<HTMLDivElement>(null)
  const shouldScrollRef = useRef(false)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)
    void adminApiService
      .getOrders({ page, limit: 20, status: status || undefined, q: query || undefined })
      .then((response) => {
        if (!active) return
        if (!response.success) throw new Error(response.error.message)
        setOrders(response.data)
        setTotalPages(response.pagination.totalPages)
        if (shouldScrollRef.current) {
          resultsContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
          shouldScrollRef.current = false
        }
      })
      .catch((reason) => {
        if (active) setError(reason instanceof Error ? reason.message : 'Orders are unavailable.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [page, query, status])

  const changePage = (nextPage: number) => {
    shouldScrollRef.current = true
    setPage(nextPage)
  }

  return (
    <div ref={resultsContainerRef} className="space-y-6 scroll-mt-6">
      <Breadcrumbs
        items={[
          { label: 'Home', href: '/' },
          { label: 'Admin', href: '/admin' },
          { label: 'Orders' },
        ]}
      />
      <div>
        <h2 className="heading text-2xl">Orders</h2>
        <p className="mt-2 text-ink">Search by order number or customer email.</p>
      </div>
      <form
        className="flex flex-col gap-3 sm:flex-row"
        onSubmit={(event) => {
          event.preventDefault()
          setPage(1)
          setQuery(search.trim())
        }}
      >
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Order number or email"
          className="min-w-0 flex-1 rounded-xl border border-line bg-paper px-4 py-2 text-base text-ink"
        />
        <Dropdown
          value={status}
          options={[...statusOptions]}
          onChange={(value) => {
            setPage(1)
            setStatus(value)
          }}
          aria-label="Filter orders by status"
        />
        <button type="submit" className="button-primary">
          Search
        </button>
      </form>

      {error && <p className="rounded-2xl bg-danger-soft p-4 text-sm text-danger">{error}</p>}
      {loading && <div className="h-48 animate-pulse rounded-3xl bg-surface" />}
      {!loading && !error && orders.length === 0 && (
        <p className="panel p-6 text-sm text-ink">No orders match these filters.</p>
      )}
      {!loading && orders.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-line bg-paper">
          <table className="w-full min-w-[780px] text-left text-sm">
            <thead className="bg-surface text-ink">
              <tr>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Placed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {orders.map((order) => (
                <tr key={order.id}>
                  <td className="px-4 py-3">
                    <Link
                      to={`/admin/orders/${order.id}`}
                      className="text-ink underline hover:text-primary"
                    >
                      {order.orderNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-ink">
                    <span className="block">{order.customerName}</span>
                    <span className="block text-xs text-muted">{order.customerEmail}</span>
                  </td>
                  <td className="px-4 py-3 text-ink">{order.status.replaceAll('_', ' ')}</td>
                  <td className="px-4 py-3 text-ink">{order.paymentStatus}</td>
                  <td className="px-4 py-3 text-ink">{formatPrice(order.totalAmount)}</td>
                  <td className="px-4 py-3 text-muted">{formatDate(order.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination currentPage={page} totalPages={totalPages} onPageChange={changePage} />
    </div>
  )
}

export default AdminOrdersPage
