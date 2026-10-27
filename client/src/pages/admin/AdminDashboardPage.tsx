import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Breadcrumbs } from '../../components/common/Breadcrumbs'
import { adminApiService } from '../../lib/services/admin/admin.service'
import type { DashboardStats } from '../../lib/types/dashboard'
import { formatPrice } from '../../lib/utils/format'

export const AdminDashboardPage: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    void adminApiService
      .getDashboardStats()
      .then((response) => {
        if (!active) return
        if (!response.success) throw new Error(response.error.message)
        setStats(response.data)
      })
      .catch((reason) => {
        if (active) setError(reason instanceof Error ? reason.message : 'Metrics are unavailable.')
      })
    return () => {
      active = false
    }
  }, [])

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Admin' }]} />
      <div>
        <h1 className="admin-page-title">Operations overview</h1>
        <p className="mt-2 text-ink">
          Live commerce metrics and shortcuts to the operational queues.
        </p>
      </div>
      {error && (
        <p className="rounded-card border border-danger/30 bg-danger-soft p-4 text-sm text-danger">
          Metrics unavailable: {error}
        </p>
      )}
      {!error && !stats && <div className="h-40 animate-pulse rounded-card bg-surface" />}
      {stats && (
        <div className="space-y-8">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ['Paid revenue', formatPrice(stats.totalRevenue)],
              ['Revenue today', formatPrice(stats.revenueToday)],
              ['Total orders', stats.totalOrders.toLocaleString('en-IN')],
              ['Orders today', stats.ordersToday.toLocaleString('en-IN')],
            ].map(([label, value]) => (
              <section key={label} className="admin-metric panel p-6">
                <p className="text-sm text-muted">{label}</p>
                <p className="mt-2 font-sans text-3xl font-semibold leading-tight text-ink">
                  {value}
                </p>
              </section>
            ))}
          </div>
          <div className="grid gap-6 xl:grid-cols-2">
            <section className="panel p-6">
              <h2 className="mb-6 text-lg">Orders to manage</h2>
              <dl className="rule-list">
                {[
                  ['Pending orders', stats.pendingOrders],
                  ['Confirmed orders', stats.confirmedOrders],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between gap-4 py-4">
                    <dt className="text-sm text-muted">{label}</dt>
                    <dd className="text-xl font-semibold">
                      {Number(value).toLocaleString('en-IN')}
                    </dd>
                  </div>
                ))}
              </dl>
              <Link to="/admin/orders" className="button-secondary mt-4">
                Open order queue
              </Link>
            </section>
            <section className="panel p-6">
              <h2 className="mb-6 text-lg">Catalog at a glance</h2>
              <dl className="rule-list">
                {[
                  ['Products', stats.totalProducts],
                  ['Active products', stats.activeProducts],
                  ['Categories', stats.totalCategories],
                  ['Active coupons', stats.activeCoupons],
                  ['Low stock', stats.lowStockCount],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between gap-4 py-3">
                    <dt className="text-sm text-muted">{label}</dt>
                    <dd className="font-semibold">{Number(value).toLocaleString('en-IN')}</dd>
                  </div>
                ))}
              </dl>
            </section>
          </div>
        </div>
      )}
      <div className="flex flex-wrap gap-3">
        <Link to="/admin/orders" className="button-primary">
          Manage orders
        </Link>
        <Link to="/admin/failures" className="button-secondary">
          Review failures
        </Link>
      </div>
    </div>
  )
}

export default AdminDashboardPage
