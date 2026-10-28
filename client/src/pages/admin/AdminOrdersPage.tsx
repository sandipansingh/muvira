import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Pagination } from '../../components/common/Pagination'
import { Dropdown } from '../../components/ui/Dropdown'
import {
  AdminPageHeader,
  AdminResultCount,
  AdminSearch,
  AdminState,
  AdminStatus,
  AdminTable,
  useAdminOrderSearch,
} from '../../components/admin/AdminWorkspace'
import { useAdminList } from '../../lib/hooks/useAdminList'
import { adminApiService } from '../../lib/services/admin/admin.service'
import type { AdminOrderSummary } from '../../lib/types/order'
import { formatDate, formatPrice } from '../../lib/utils/format'

const statusOptions = [
  '',
  'pending',
  'confirmed',
  'processing',
  'shipped',
  'out_for_delivery',
  'delivered',
  'cancelled',
  'rto',
  'returned',
  'refunded',
  'lost',
  'damaged',
  'delivery_failed',
].map((value) => ({
  value,
  label: value
    ? value === 'rto'
      ? 'RTO'
      : value.replaceAll('_', ' ').replace(/^./, (char) => char.toUpperCase())
    : 'All order statuses',
}))
const paymentOptions = ['', 'pending', 'paid', 'failed', 'refunded'].map((value) => ({
  value,
  label: value ? value.replace(/^./, (char) => char.toUpperCase()) : 'All payments',
}))
const fulfillmentOptions = ['', 'unfulfilled', 'partial', 'fulfilled', 'exception'].map(
  (value) => ({
    value,
    label: value ? value.replace(/^./, (char) => char.toUpperCase()) : 'All fulfillment',
  })
)

export const AdminOrdersPage: React.FC = () => {
  const { page, params, update, changePage, resultsRef, scrollToResults, revision, reload } =
    useAdminList()
  const { query, setQuery } = useAdminOrderSearch()
  const [search, setSearch] = useState(query)
  const [orders, setOrders] = useState<AdminOrderSummary[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const status = statusOptions.some((option) => option.value === params.get('status'))
    ? params.get('status') || ''
    : ''
  const payment = paymentOptions.some((option) => option.value === params.get('payment_status'))
    ? params.get('payment_status') || ''
    : ''
  const fulfillment = fulfillmentOptions.some(
    (option) => option.value === params.get('fulfillment_status')
  )
    ? params.get('fulfillment_status') || ''
    : ''
  useEffect(() => {
    setSearch(query)
  }, [query])
  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)
    void adminApiService
      .getOrders({
        page,
        limit: 20,
        status: status || undefined,
        paymentStatus: payment || undefined,
        fulfillmentStatus: fulfillment || undefined,
        q: query || undefined,
      })
      .then((response) => {
        if (!active) return
        if (!response.success) throw new Error(response.error.message)
        if (page > Math.max(1, response.pagination.totalPages)) {
          update({ page: Math.max(1, response.pagination.totalPages) }, true)
          return
        }
        setOrders(response.data)
        setTotal(response.pagination.total)
        setTotalPages(response.pagination.totalPages)
        scrollToResults()
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
  }, [page, status, payment, fulfillment, query, revision, scrollToResults, update])
  const filter = (key: string, value: string) => update({ [key]: value, page: 1 })
  const searchOrders = (value: string) => {
    setSearch(value)
    setQuery(value.trim())
    update({ page: 1 })
  }
  return (
    <div ref={resultsRef} className="space-y-6 scroll-mt-6">
      <AdminPageHeader
        title="Orders"
        description="Find an order, check its progress and manage the next step."
      />
      <div className="admin-filter-toolbar">
        <AdminSearch
          label="Order number or email"
          value={search}
          onChange={setSearch}
          onSearch={() => searchOrders(search)}
          clearLabel="Clear order search"
          onClear={() => searchOrders('')}
        />
        <Dropdown
          label="Order status"
          aria-label="Filter orders by status"
          value={status}
          options={statusOptions}
          onChange={(value) => filter('status', value)}
        />
        <Dropdown
          label="Payment"
          aria-label="Payment status"
          value={payment}
          options={paymentOptions}
          onChange={(value) => filter('payment_status', value)}
        />
        <Dropdown
          label="Fulfillment"
          aria-label="Fulfillment status"
          value={fulfillment}
          options={fulfillmentOptions}
          onChange={(value) => filter('fulfillment_status', value)}
        />
      </div>
      {loading ? (
        <AdminState loading />
      ) : error ? (
        <AdminState error={error} onRetry={reload} />
      ) : orders.length === 0 ? (
        <AdminState title="No orders match these filters">
          Try another order number, email or status.
        </AdminState>
      ) : (
        <AdminTable
          label="Orders"
          headers={[
            'Order',
            'Customer',
            'Order status',
            'Payment',
            'Fulfillment',
            'Total',
            'Placed',
          ]}
        >
          {orders.map((order) => (
            <tr key={order.id}>
              <td>
                <Link
                  to={`/admin/orders/${order.id}`}
                  className="font-semibold hover:text-primary underline underline-offset-4"
                >
                  {order.orderNumber}
                </Link>
                {order.awbCode && <span className="admin-product-meta">AWB {order.awbCode}</span>}
              </td>
              <td>
                <span className="block font-medium">{order.customerName}</span>
                <span className="admin-product-meta email-value" title={order.customerEmail}>
                  {order.customerEmail}
                </span>
              </td>
              <td>
                <AdminStatus status={order.status} />
              </td>
              <td>
                <AdminStatus status={order.paymentStatus} />
              </td>
              <td>
                <AdminStatus status={order.fulfillmentStatus} />
              </td>
              <td className="admin-number">{formatPrice(order.totalAmount)}</td>
              <td className="whitespace-nowrap text-muted">{formatDate(order.createdAt)}</td>
            </tr>
          ))}
        </AdminTable>
      )}
      {!loading && !error && (
        <div className="admin-list-footer">
          <AdminResultCount page={page} total={total} count={orders.length} noun="orders" />
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={changePage} />
        </div>
      )}
    </div>
  )
}
export default AdminOrdersPage
