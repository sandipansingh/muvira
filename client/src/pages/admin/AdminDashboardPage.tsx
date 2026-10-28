import React from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowUpRight,
  ArrowRight,
  Package,
  ShoppingBag,
  TriangleAlert,
  RefreshCw,
} from 'lucide-react'
import {
  AdminPageHeader,
  AdminState,
  AdminStatus,
  AdminTable,
} from '../../components/admin/AdminWorkspace'
import { useAdminResource } from '../../lib/hooks/useAdminResource'
import { adminApiService } from '../../lib/services/admin/admin.service'
import { formatDate, formatPrice } from '../../lib/utils/format'

async function loadStats() {
  const response = await adminApiService.getDashboardStats()
  if (!response.success) throw new Error(response.error.message)
  return response.data
}
async function loadOrders() {
  const response = await adminApiService.getOrders({ page: 1, limit: 5 })
  if (!response.success) throw new Error(response.error.message)
  return response.data
}
async function loadStock() {
  const response = await adminApiService.getInventory(1, 5, true)
  if (!response.success) throw new Error(response.error.message)
  return response.data
}
async function loadRecovery() {
  const response = await adminApiService.getDiagnosticSummary()
  if (!response.success) throw new Error(response.error.message)
  return response.data
}

export const AdminDashboardPage: React.FC = () => {
  const stats = useAdminResource(loadStats)
  const orders = useAdminResource(loadOrders)
  const stock = useAdminResource(loadStock)
  const recovery = useAdminResource(loadRecovery)
  const refresh = () => {
    stats.reload()
    orders.reload()
    stock.reload()
    recovery.reload()
  }
  return (
    <div className="space-y-7">
      <AdminPageHeader
        title="Operations overview"
        description="Your store at a glance. Start with the work that needs attention."
        actions={
          <button type="button" className="button-secondary" onClick={refresh}>
            <RefreshCw className="h-4 w-4" />
            Refresh overview
          </button>
        }
      />
      <section aria-labelledby="attention-title">
        <div className="admin-section-heading">
          <h2 id="attention-title">Needs attention</h2>
          <span className="text-xs text-muted">Live operational queues</span>
        </div>
        {stats.loading ? (
          <AdminState loading />
        ) : stats.error ? (
          <AdminState error={stats.error} onRetry={stats.reload} />
        ) : (
          stats.data && (
            <div className="grid gap-3 md:grid-cols-3">
              {[
                {
                  label: 'Pending orders',
                  detail: 'Review the order queue',
                  count: stats.data.pendingOrders,
                  to: '/admin/orders?status=pending',
                  icon: ShoppingBag,
                },
                {
                  label: 'Confirmed orders',
                  detail: 'Check the next fulfillment step',
                  count: stats.data.confirmedOrders,
                  to: '/admin/orders?status=confirmed',
                  icon: Package,
                },
                {
                  label: 'Active products low on stock',
                  detail: '10 units or fewer',
                  count: stats.data.lowStockCount,
                  to: '/admin/catalog?tab=inventory&low_stock_only=true',
                  icon: TriangleAlert,
                },
              ].map(({ label, detail, count, to, icon: Icon }) => (
                <Link key={label} to={to} className="admin-attention-link">
                  <div>
                    <span className="flex items-center gap-2 text-sm font-medium">
                      <Icon className="h-4 w-4 text-muted" />
                      {label}
                    </span>
                    <span className="mt-2 block text-xs text-muted">{detail}</span>
                  </div>
                  <span className="admin-attention-count">{count.toLocaleString('en-IN')}</span>
                  <ArrowUpRight className="h-4 w-4 shrink-0 text-muted" />
                </Link>
              ))}
            </div>
          )
        )}
      </section>
      {stats.data && !stats.error && (
        <section
          aria-label="Store performance"
          className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
        >
          {[
            ['Paid revenue', formatPrice(stats.data.totalRevenue), 'All time'],
            ['Revenue today', formatPrice(stats.data.revenueToday), 'Today'],
            ['Total orders', stats.data.totalOrders.toLocaleString('en-IN'), 'All time'],
            ['Orders today', stats.data.ordersToday.toLocaleString('en-IN'), 'Today'],
          ].map(([label, value, period]) => (
            <div key={label} className="admin-metric p-5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm text-muted">{label}</p>
                <span className="text-xs text-muted">{period}</span>
              </div>
              <p className="admin-metric__value">{value}</p>
            </div>
          ))}
        </section>
      )}
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <section className="min-w-0" aria-labelledby="recent-orders-title">
          <div className="admin-section-heading">
            <h2 id="recent-orders-title">Recent orders</h2>
            <Link to="/admin/orders" className="admin-section-link">
              View all orders
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          {orders.loading ? (
            <AdminState loading />
          ) : orders.error ? (
            <AdminState error={orders.error} onRetry={orders.reload} />
          ) : !orders.data?.length ? (
            <AdminState title="No orders yet">New orders will appear here.</AdminState>
          ) : (
            <AdminTable
              label="Recent orders"
              headers={['Order', 'Customer', 'Status', 'Total', 'Placed']}
            >
              {orders.data.map((order) => (
                <tr key={order.id}>
                  <td>
                    <Link
                      className="font-semibold hover:text-primary"
                      to={`/admin/orders/${order.id}`}
                    >
                      {order.orderNumber}
                    </Link>
                  </td>
                  <td>{order.customerName}</td>
                  <td>
                    <AdminStatus status={order.status} />
                  </td>
                  <td className="admin-number">{formatPrice(order.totalAmount)}</td>
                  <td className="whitespace-nowrap text-muted">{formatDate(order.createdAt)}</td>
                </tr>
              ))}
            </AdminTable>
          )}
        </section>
        <div className="space-y-6">
          <section className="panel p-5" aria-labelledby="stock-title">
            <div className="admin-section-heading">
              <h2 id="stock-title">Low-stock inventory</h2>
            </div>
            <p className="mb-4 text-xs text-muted">
              Lowest quantities first, including hidden products.
            </p>
            {stock.loading ? (
              <AdminState loading />
            ) : stock.error ? (
              <AdminState error={stock.error} onRetry={stock.reload} />
            ) : !stock.data?.length ? (
              <p className="py-5 text-sm text-muted">No products are low on stock.</p>
            ) : (
              <ul className="divide-y divide-line">
                {stock.data.map((item) => (
                  <li key={item.productId} className="flex items-start justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <span className="admin-product-name text-sm" title={item.productName}>
                        {item.productName}
                      </span>
                      <span className="admin-product-meta">{item.sku || 'No SKU'}</span>
                    </div>
                    <span className="shrink-0 text-sm font-semibold tabular-nums">
                      {item.stock} left
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <Link
              className="admin-section-link mt-2"
              to="/admin/catalog?tab=inventory&low_stock_only=true"
            >
              Manage inventory
              <ArrowRight className="h-4 w-4" />
            </Link>
          </section>
          <section className="panel p-5" aria-labelledby="recovery-title">
            <div className="admin-section-heading">
              <h2 id="recovery-title">Issues &amp; recovery</h2>
            </div>
            {recovery.loading ? (
              <AdminState loading />
            ) : recovery.error ? (
              <AdminState error={recovery.error} onRetry={recovery.reload} />
            ) : (
              recovery.data && (
                <dl className="space-y-3 text-sm">
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted">Recovery worker</dt>
                    <dd className="capitalize">{recovery.data.workerState}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted">Overdue payment checks</dt>
                    <dd className="font-semibold">{recovery.data.overdueLateCaptureWatches}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted">Cancellation refunds pending</dt>
                    <dd className="font-semibold">{recovery.data.pendingCancellationRefunds}</dd>
                  </div>
                </dl>
              )
            )}
            <Link className="admin-section-link mt-3" to="/admin/failures">
              Review recovery queues
              <ArrowRight className="h-4 w-4" />
            </Link>
          </section>
        </div>
      </div>
    </div>
  )
}
export default AdminDashboardPage
