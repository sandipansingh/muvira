import React, { useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  ArrowRight,
  ArrowUpRight,
  Package,
  RefreshCw,
  ShoppingBag,
  TriangleAlert,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import {
  AdminPageHeader,
  AdminState,
  AdminStatus,
  AdminTable,
} from '../../components/admin/AdminWorkspace'
import { AdminRevenue } from '../../components/admin/AdminRevenue'
import { useAdminResource } from '../../lib/hooks/useAdminResource'
import { adminApiService } from '../../lib/services/admin/admin.service'
import type { AnalyticsPeriod } from '../../lib/types/adminAnalytics'
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
  const { user } = useAuth()
  const [params, setParams] = useSearchParams()
  const rawPeriod = params.get('period')
  const period: AnalyticsPeriod =
    rawPeriod === 'day' || rawPeriod === 'month' || rawPeriod === 'year' ? rawPeriod : 'week'
  const analytics = useAdminResource(
    useCallback(async () => {
      const response = await adminApiService.getDashboardAnalytics(period)
      if (!response.success) throw new Error(response.error.message)
      return response.data
    }, [period])
  )
  const stats = useAdminResource(loadStats)
  const orders = useAdminResource(loadOrders)
  const stock = useAdminResource(loadStock)
  const recovery = useAdminResource(loadRecovery)
  const refresh = () => {
    analytics.reload()
    stats.reload()
    orders.reload()
    stock.reload()
    recovery.reload()
  }
  const name = user?.fullName?.trim().split(/\s+/)[0]
  return (
    <div className="admin-overview">
      <AdminPageHeader
        title={name ? `Hello, ${name}!` : 'Store overview'}
        actions={
          <button
            type="button"
            className="admin-icon-button admin-refresh"
            onClick={refresh}
            aria-label="Refresh overview"
            title="Refresh overview"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        }
      />
      <div className="admin-overview-grid">
        <div className="admin-overview-main">
          <AdminRevenue
            period={period}
            onPeriodChange={(next) =>
              setParams((current) => {
                const updated = new URLSearchParams(current)
                updated.set('period', next)
                return updated
              })
            }
            data={analytics.data}
            loading={analytics.loading}
            error={analytics.error}
            onRetry={analytics.reload}
          />
          <section className="admin-overview-orders" aria-labelledby="recent-orders-title">
            <div className="admin-section-heading">
              <h2 id="recent-orders-title">Recent orders</h2>
              <Link to="/admin/orders" className="admin-section-link">
                See all
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
                    <td className="whitespace-nowrap text-muted">
                      <time dateTime={order.createdAt} aria-label={formatDate(order.createdAt)}>
                        {new Intl.DateTimeFormat('en-IN', {
                          timeZone: 'Asia/Kolkata',
                          day: 'numeric',
                          month: 'short',
                        }).format(new Date(order.createdAt))}
                      </time>
                    </td>
                  </tr>
                ))}
              </AdminTable>
            )}
          </section>
        </div>
        <aside className="admin-overview-rail" aria-label="Live store operations">
          <section aria-labelledby="attention-title">
            <div className="admin-section-heading">
              <h2 id="attention-title">Needs attention</h2>
              <span className="admin-live-label">Live queues</span>
            </div>
            {stats.loading ? (
              <AdminState loading />
            ) : stats.error ? (
              <AdminState error={stats.error} onRetry={stats.reload} />
            ) : (
              stats.data && (
                <div className="admin-summary-list">
                  {[
                    {
                      label: 'Pending orders',
                      count: stats.data.pendingOrders,
                      to: '/admin/orders?status=pending',
                      icon: ShoppingBag,
                    },
                    {
                      label: 'Confirmed orders',
                      count: stats.data.confirmedOrders,
                      to: '/admin/orders?status=confirmed',
                      icon: Package,
                    },
                    {
                      label: 'Active products low on stock',
                      count: stats.data.lowStockCount,
                      to: '/admin/catalog?tab=inventory&low_stock_only=true',
                      icon: TriangleAlert,
                    },
                  ].map(({ label, count, to, icon: Icon }) => (
                    <Link key={label} to={to} className="admin-summary-row">
                      <Icon className="h-[18px] w-[18px] shrink-0 text-muted" aria-hidden="true" />
                      <span>{label}</span>
                      <strong>{count.toLocaleString('en-IN')}</strong>
                      <ArrowUpRight
                        className="h-3.5 w-3.5 shrink-0 text-muted"
                        aria-hidden="true"
                      />
                    </Link>
                  ))}
                </div>
              )
            )}
          </section>
          <section aria-labelledby="products-title">
            <div className="admin-section-heading">
              <h2 id="products-title">Products</h2>
              <Link to="/admin/catalog" className="admin-section-link">
                See all
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            {stats.loading ? (
              <AdminState loading />
            ) : stats.error ? (
              <AdminState error={stats.error} onRetry={stats.reload} />
            ) : (
              stats.data && (
                <dl className="admin-summary-list">
                  <div className="admin-summary-row">
                    <dt>Active listings</dt>
                    <dd>{stats.data.activeProducts.toLocaleString('en-IN')}</dd>
                  </div>
                  <div className="admin-summary-row">
                    <dt>Hidden products</dt>
                    <dd>
                      {(stats.data.totalProducts - stats.data.activeProducts).toLocaleString(
                        'en-IN'
                      )}
                    </dd>
                  </div>
                  <div className="admin-summary-row">
                    <dt>Active products at ≤10 units</dt>
                    <dd>{stats.data.lowStockCount.toLocaleString('en-IN')}</dd>
                  </div>
                </dl>
              )
            )}
          </section>
          <section aria-labelledby="stock-title">
            <div className="admin-section-heading">
              <h2 id="stock-title">Low-stock inventory</h2>
            </div>
            <div className="panel admin-rail-panel">
              <p className="admin-rail-caption">
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
                    <li key={item.productId} className="admin-stock-row">
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
                className="admin-section-link"
                to="/admin/catalog?tab=inventory&low_stock_only=true"
              >
                Manage inventory
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </section>
          <section aria-labelledby="recovery-title">
            <div className="admin-section-heading">
              <h2 id="recovery-title">Issues &amp; recovery</h2>
            </div>
            <div className="panel admin-rail-panel">
              {recovery.loading ? (
                <AdminState loading />
              ) : recovery.error ? (
                <AdminState error={recovery.error} onRetry={recovery.reload} />
              ) : (
                recovery.data && (
                  <dl className="admin-recovery-list">
                    <div>
                      <dt>Recovery worker</dt>
                      <dd className="capitalize">{recovery.data.workerState}</dd>
                    </div>
                    <div>
                      <dt>Overdue payment checks</dt>
                      <dd>{recovery.data.overdueLateCaptureWatches}</dd>
                    </div>
                    <div>
                      <dt>Cancellation refunds pending</dt>
                      <dd>{recovery.data.pendingCancellationRefunds}</dd>
                    </div>
                  </dl>
                )
              )}
              <Link className="admin-section-link mt-2" to="/admin/failures">
                Review queues
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </section>
        </aside>
      </div>
    </div>
  )
}
export default AdminDashboardPage
