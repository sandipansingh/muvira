import React, { useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowUpRight,
  Boxes,
  Gauge,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  ReceiptText,
  Settings,
  ShoppingBag,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { Modal } from '../common/Modal'
import { AdminWorkspaceProvider } from './AdminWorkspace'

const navigation = [
  { to: '/admin', label: 'Overview', icon: Gauge, end: true },
  { to: '/admin/orders', label: 'Orders', icon: ShoppingBag, end: false },
  { to: '/admin/catalog', label: 'Catalog', icon: Boxes, end: false },
  { to: '/admin/coupons', label: 'Coupons', icon: ReceiptText, end: false },
  { to: '/admin/failures', label: 'Issues & recovery', icon: AlertTriangle, end: false },
  { to: '/admin/settings', label: 'Settings', icon: Settings, end: false },
] as const

function AdminNavigation({
  onNavigate,
  collapsed = false,
}: {
  onNavigate?: () => void
  collapsed?: boolean
}) {
  return (
    <nav aria-label="Admin sections" className="admin-navigation">
      {navigation.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          onClick={onNavigate}
          aria-label={label}
          title={collapsed ? label : undefined}
          className={({ isActive }) => `admin-navigation__link ${isActive ? 'is-active' : ''}`}
        >
          <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
          <span className={collapsed ? 'sr-only' : ''}>{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}

export const AdminShell: React.FC = () => {
  const [menuOpen, setMenuOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const { user } = useAuth()
  const { pathname } = useLocation()
  const section =
    navigation.find((item) => (item.end ? pathname === item.to : pathname.startsWith(item.to)))
      ?.label ?? 'Administration'
  return (
    <AdminWorkspaceProvider>
      <div className={`admin-shell ${collapsed ? 'is-collapsed' : ''}`}>
        <a href="#admin-content" className="skip-link button-primary">
          Skip to content
        </a>
        <aside className="admin-sidebar">
          <div className="admin-brand-row">
            <Link to="/admin" className="admin-brand" aria-label="Muvira admin overview">
              <img src="/logo.png" alt="" width={659} height={723} />
              {!collapsed && (
                <span>
                  Muvira<span className="admin-brand__caption">Admin workspace</span>
                </span>
              )}
            </Link>
          </div>
          <div className={`admin-navigation-caption ${collapsed ? 'sr-only' : ''}`}>Store</div>
          <AdminNavigation collapsed={collapsed} />
          <div className="admin-sidebar__bottom">
            <Link
              to="/"
              className="admin-store-link"
              aria-label="Visit storefront"
              title={collapsed ? 'Visit storefront' : undefined}
            >
              <ArrowUpRight className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
              <span className={collapsed ? 'sr-only' : ''}>Visit storefront</span>
            </Link>
            <button
              type="button"
              className="admin-collapse-button"
              onClick={() => setCollapsed(!collapsed)}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              aria-expanded={!collapsed}
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? (
                <PanelLeftOpen className="h-[18px] w-[18px]" />
              ) : (
                <>
                  <PanelLeftClose className="h-[18px] w-[18px]" />
                  <span>Collapse sidebar</span>
                </>
              )}
            </button>
          </div>
        </aside>
        <div className="admin-workspace">
          <header className="admin-topbar">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                className="admin-icon-button lg:hidden"
                onClick={() => setMenuOpen(true)}
                aria-label="Open admin navigation"
              >
                <Menu className="h-5 w-5" />
              </button>
              <span className="admin-topbar__section">{section}</span>
            </div>
            <div className="admin-topbar__identity">
              <span className="admin-identity-dot" aria-hidden="true" />
              <Link to="/profile" className="admin-account-link">
                {user?.fullName || 'My account'}
                <span>Store administrator</span>
              </Link>
            </div>
          </header>
          <main id="admin-content" tabIndex={-1} className="admin-content">
            <Outlet />
          </main>
        </div>
        <Modal isOpen={menuOpen} onClose={() => setMenuOpen(false)} title="Store management">
          <AdminNavigation onNavigate={() => setMenuOpen(false)} />
          <Link to="/" className="admin-store-link">
            Visit storefront <ArrowUpRight className="h-4 w-4" />
          </Link>
        </Modal>
      </div>
    </AdminWorkspaceProvider>
  )
}
