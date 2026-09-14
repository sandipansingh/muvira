import React from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { AlertTriangle, Boxes, Gauge, ReceiptText, Settings, ShoppingBag } from 'lucide-react'

const navigation = [
  { to: '/admin', label: 'Overview', icon: Gauge, end: true },
  { to: '/admin/orders', label: 'Orders', icon: ShoppingBag, end: false },
  { to: '/admin/catalog', label: 'Catalog', icon: Boxes, end: false },
  { to: '/admin/coupons', label: 'Coupons', icon: ReceiptText, end: false },
  { to: '/admin/settings', label: 'Settings', icon: Settings, end: false },
  { to: '/admin/failures', label: 'Failures', icon: AlertTriangle, end: false },
] as const

export const AdminShell: React.FC = () => (
  <main className="editorial-page py-8 sm:py-10">
    <div className="editorial-container max-w-7xl">
      <div className="mb-8 border-b border-line pb-5">
        <span className="eyebrow mb-1 block">Operations</span>
        <h1 className="heading page-title">Admin console</h1>
      </div>
      <nav aria-label="Admin sections" className="mb-8 flex gap-2 overflow-x-auto pb-2">
        {navigation.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm transition-colors ${
                isActive
                  ? 'bg-primary text-white'
                  : 'border border-line bg-paper text-ink hover:bg-surface'
              }`
            }
          >
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </div>
  </main>
)
