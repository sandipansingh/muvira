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
        <h2 className="heading text-2xl">Operations overview</h2>
        <p className="mt-2 text-ink">
          Live commerce metrics and shortcuts to the operational queues.
        </p>
      </div>
      {error && (
        <p className="rounded-2xl border border-danger/30 bg-danger-soft p-4 text-sm text-danger">
          Metrics unavailable: {error}
        </p>
      )}
      {!error && !stats && <div className="h-40 animate-pulse rounded-3xl bg-surface" />}
      {stats && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            ['Total orders', stats.totalOrders.toLocaleString('en-IN')],
            ['Orders today', stats.ordersToday.toLocaleString('en-IN')],
            ['Paid revenue', formatPrice(stats.totalRevenue)],
            ['Revenue today', formatPrice(stats.revenueToday)],
            ['Products', stats.totalProducts.toLocaleString('en-IN')],
            ['Active products', stats.activeProducts.toLocaleString('en-IN')],
            ['Categories', stats.totalCategories.toLocaleString('en-IN')],
            ['Active coupons', stats.activeCoupons.toLocaleString('en-IN')],
            ['Low stock', stats.lowStockCount.toLocaleString('en-IN')],
            ['Pending orders', stats.pendingOrders.toLocaleString('en-IN')],
            ['Confirmed orders', stats.confirmedOrders.toLocaleString('en-IN')],
          ].map(([label, value]) => (
            <section key={label} className="panel p-5">
              <p className="text-sm text-muted">{label}</p>
              <p className="mt-2 font-display text-2xl font-bold leading-tight text-ink">{value}</p>
            </section>
          ))}
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
