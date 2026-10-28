import React, { useRef, useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import {
  AlertTriangle,
  Boxes,
  Gauge,
  Globe,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  ReceiptText,
  Search,
  Settings,
  ShoppingBag,
  X,
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
  query = '',
}: {
  onNavigate?: () => void
  collapsed?: boolean
  query?: string
}) {
  const matches = navigation.filter(
    (item) =>
      (item.label !== 'Settings' || query.trim()) &&
      item.label.toLowerCase().includes(query.trim().toLowerCase())
  )
  return (
    <nav aria-label="Admin sections" className="admin-navigation">
      {matches.map(({ to, label, icon: Icon, end }) => (
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
      {!matches.length && (
        <p role="status" className="admin-navigation-empty">
          No matching sections.
        </p>
      )}
    </nav>
  )
}

function NavigationSearch({
  query,
  setQuery,
}: {
  query: string
  setQuery: (value: string) => void
}) {
  const input = useRef<HTMLInputElement>(null)
  return (
    <div className="admin-navigation-search">
      <Search className="h-4 w-4 shrink-0" aria-hidden="true" />
      <input
        ref={input}
        type="search"
        aria-label="Find an admin section"
        placeholder="Find a section"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      {query && (
        <button
          type="button"
          className="admin-icon-button"
          aria-label="Clear navigation search"
          onClick={() => {
            setQuery('')
            input.current?.focus()
          }}
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}

function AdminAccount({
  collapsed = false,
  onNavigate,
  hideSettings = false,
}: {
  collapsed?: boolean
  onNavigate?: () => void
  hideSettings?: boolean
}) {
  const { user, logout } = useAuth()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const busyRef = useRef(false)
  const name = user?.fullName || 'My account'
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
  const signOut = async () => {
    if (busyRef.current) return
    busyRef.current = true
    setBusy(true)
    setError('')
    try {
      await logout()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to log out. Try again.')
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }
  return (
    <div className={`admin-account-card ${collapsed ? 'is-collapsed' : ''}`}>
      <Link
        to="/profile"
        onClick={onNavigate}
        className="admin-account-profile"
        aria-label="My account"
        title={collapsed ? name : undefined}
      >
        <span className="admin-avatar" aria-hidden="true">
          {initials}
        </span>
        {!collapsed && (
          <span className="admin-account-copy">
            <strong>{name}</strong>
            <span className="email-value" title={user?.email}>
              {user?.email || 'Store administrator'}
            </span>
          </span>
        )}
      </Link>
      {!hideSettings && (
        <NavLink
          to="/admin/settings"
          onClick={onNavigate}
          className="admin-account-logout"
          aria-label="Settings"
          title={collapsed ? 'Settings' : undefined}
        >
          <Settings className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
          <span className={collapsed ? 'sr-only' : ''}>Settings</span>
        </NavLink>
      )}
      <button
        type="button"
        onClick={() => void signOut()}
        disabled={busy}
        aria-busy={busy}
        className="admin-account-logout"
        title={collapsed ? 'Log out' : undefined}
        aria-label="Log out"
      >
        <LogOut className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
        <span className={collapsed ? 'sr-only' : ''}>Log out</span>
      </button>
      {error && (
        <p role="alert" className="admin-account-error">
          {error}
        </p>
      )}
    </div>
  )
}

export const AdminShell: React.FC = () => {
  const menuButton = useRef<HTMLButtonElement>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [query, setQuery] = useState('')
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
              {!collapsed && <span>Muvira</span>}
            </Link>
            <button
              type="button"
              className="admin-icon-button admin-collapse-button"
              onClick={() => {
                setCollapsed(!collapsed)
                setQuery('')
              }}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              aria-expanded={!collapsed}
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? (
                <PanelLeftOpen className="h-4 w-4" />
              ) : (
                <PanelLeftClose className="h-4 w-4" />
              )}
            </button>
          </div>
          {!collapsed && (
            <>
              <div className="admin-store-identity">
                <ShoppingBag className="h-4 w-4" aria-hidden="true" />
                <span>Muvira store</span>
              </div>
              <NavigationSearch query={query} setQuery={setQuery} />
              <div className="admin-navigation-caption">Menu</div>
            </>
          )}
          <AdminNavigation collapsed={collapsed} query={query} />
          <div className="admin-sidebar__bottom">
            <AdminAccount collapsed={collapsed} hideSettings={Boolean(query.trim())} />
          </div>
        </aside>
        <div className="admin-workspace">
          <header className="admin-mobile-bar">
            <button
              ref={menuButton}
              type="button"
              className="admin-icon-button"
              onClick={() => setMenuOpen(true)}
              aria-label="Open admin navigation"
            >
              <Menu className="h-5 w-5" />
            </button>
            <Link to="/admin" className="admin-mobile-brand">
              Muvira
            </Link>
            <Link to="/" className="admin-icon-button" aria-label="Visit storefront">
              <Globe className="h-5 w-5" />
            </Link>
          </header>
          <main id="admin-content" tabIndex={-1} className="admin-content">
            <Outlet />
          </main>
        </div>
        <Modal
          presentation="drawer"
          isOpen={menuOpen}
          onClose={() => setMenuOpen(false)}
          title="Store management"
          restoreFocus={() => menuButton.current}
        >
          <div className="admin-mobile-navigation">
            <NavigationSearch query={query} setQuery={setQuery} />
            <AdminNavigation query={query} onNavigate={() => setMenuOpen(false)} />
            <AdminAccount
              onNavigate={() => setMenuOpen(false)}
              hideSettings={Boolean(query.trim())}
            />
          </div>
        </Modal>
      </div>
    </AdminWorkspaceProvider>
  )
}
