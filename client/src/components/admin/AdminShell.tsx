import React, { useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowUpRight,
  Boxes,
  Gauge,
  Menu,
  ReceiptText,
  Settings,
  ShoppingBag,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { Modal } from '../common/Modal'
import { Button } from '../ui/Button'

const navigation = [
  { to: '/admin', label: 'Overview', icon: Gauge, end: true },
  { to: '/admin/orders', label: 'Orders', icon: ShoppingBag, end: false },
  { to: '/admin/catalog', label: 'Catalog', icon: Boxes, end: false },
  { to: '/admin/coupons', label: 'Coupons', icon: ReceiptText, end: false },
  { to: '/admin/settings', label: 'Settings', icon: Settings, end: false },
  { to: '/admin/failures', label: 'Failures', icon: AlertTriangle, end: false },
] as const

const AdminNavigation: React.FC<{ onNavigate?: () => void }> = ({ onNavigate }) => (
  <nav aria-label="Admin sections" className="admin-navigation">
    {navigation.map(({ to, label, icon: Icon, end }) => (
      <NavLink
        key={to}
        to={to}
        end={end}
        onClick={onNavigate}
        className={({ isActive }) => `admin-navigation__link ${isActive ? 'is-active' : ''}`}
      >
        <Icon className="h-[18px] w-[18px]" />
        {label}
      </NavLink>
    ))}
  </nav>
)

export const AdminShell: React.FC = () => {
  const [menuOpen, setMenuOpen] = useState(false)
  const { user } = useAuth()
  return (
    <div className="admin-shell">
      <a href="#admin-content" className="skip-link button-primary">
        Skip to content
      </a>
      <aside className="admin-sidebar">
        <Link to="/" className="brand-lockup">
          <img
            src="/logo.png"
            alt=""
            width={659}
            height={723}
            className="brand-mark w-auto object-contain"
          />
          <span className="font-display text-3xl">Muvira</span>
        </Link>
        <p className="eyebrow mb-5 mt-12">Store management</p>
        <AdminNavigation />
        <Link to="/" className="admin-store-link">
          Visit storefront <ArrowUpRight className="h-4 w-4" />
        </Link>
      </aside>
      <div className="admin-workspace">
        <header className="admin-topbar">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setMenuOpen(true)}
              aria-label="Open admin navigation"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <span className="text-sm font-semibold">Muvira / Administration</span>
          </div>
          <Link
            to="/profile"
            className="inline-flex min-h-11 items-center text-sm text-muted hover:text-primary"
          >
            {user?.fullName || 'My account'}
          </Link>
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
  )
}
