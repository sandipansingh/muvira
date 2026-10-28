import React, { createContext, useContext, useRef, useState } from 'react'
import { LoaderCircle, Search, X } from 'lucide-react'
import { motion } from 'framer-motion'
import { Breadcrumbs } from '../common/Breadcrumbs'
import { Badge, type BadgeTone } from '../ui/Badge'

const OrderSearchContext = createContext<{
  query: string
  setQuery: React.Dispatch<React.SetStateAction<string>>
} | null>(null)

export function AdminWorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [query, setQuery] = useState('')
  return (
    <OrderSearchContext.Provider value={{ query, setQuery }}>
      {children}
    </OrderSearchContext.Provider>
  )
}

export function useAdminOrderSearch() {
  const context = useContext(OrderSearchContext)
  const [query, setQuery] = useState('')
  return context ?? { query, setQuery }
}

export function AdminPageHeader({
  title,
  description,
  actions,
  section,
}: {
  title: string
  description: string
  actions?: React.ReactNode
  section?: string
}) {
  return (
    <header className="admin-page-header">
      <Breadcrumbs
        className="admin-breadcrumbs"
        items={[
          { label: 'Admin', href: '/admin' },
          ...(section
            ? [{ label: section, href: section === 'Orders' ? '/admin/orders' : '/admin/catalog' }]
            : []),
          { label: title },
        ]}
      />
      <div className="admin-page-header__row">
        <div className="min-w-0">
          <h1 className="admin-page-title">{title}</h1>
          <p className="admin-page-description">{description}</p>
        </div>
        {actions && <div className="admin-page-actions">{actions}</div>}
      </div>
    </header>
  )
}

export function AdminState({
  loading,
  error,
  title = 'Nothing here yet',
  children,
  onRetry,
}: {
  loading?: boolean
  error?: string | null
  title?: string
  children?: React.ReactNode
  onRetry?: () => void
}) {
  return (
    <div
      className={`admin-state ${error ? 'admin-state--error' : ''}`}
      role={error ? 'alert' : 'status'}
    >
      {loading ? (
        <>
          <motion.span
            className="text-primary"
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
            aria-hidden="true"
          >
            <LoaderCircle className="h-5 w-5" />
          </motion.span>
          <p>Loading…</p>
        </>
      ) : (
        <>
          <p className="font-semibold text-ink">{error ? 'Unable to load this section' : title}</p>
          <p className="text-sm text-muted">{error || children}</p>
          {error && onRetry && (
            <button type="button" className="button-secondary" onClick={onRetry}>
              Try again
            </button>
          )}
        </>
      )}
    </div>
  )
}

const statusTones: Record<string, BadgeTone> = {
  paid: 'success',
  delivered: 'success',
  published: 'success',
  active: 'success',
  fulfilled: 'success',
  pending: 'warning',
  processing: 'info',
  confirmed: 'info',
  partial: 'warning',
  unfulfilled: 'neutral',
  failed: 'danger',
  cancelled: 'neutral',
  refunded: 'neutral',
  exception: 'danger',
  rto: 'warning',
  shipped: 'info',
  out_for_delivery: 'info',
  delivery_failed: 'danger',
  lost: 'danger',
  damaged: 'danger',
  'low stock': 'warning',
  'out of stock': 'danger',
}

export function AdminStatus({ status }: { status: string }) {
  const label = status === 'rto' ? 'RTO' : status.replaceAll('_', ' ')
  return (
    <Badge tone={statusTones[status.toLowerCase()] ?? 'neutral'} className="admin-status">
      <span className="admin-status__dot" aria-hidden="true" />
      {label}
    </Badge>
  )
}

export function AdminTable({
  label,
  headers,
  children,
}: {
  label: string
  headers: string[]
  children: React.ReactNode
}) {
  return (
    <div className="admin-table-scroll" role="region" aria-label={label} tabIndex={0}>
      <table className="admin-table">
        <caption className="sr-only">{label}</caption>
        <thead>
          <tr>
            {headers.map((header) => (
              <th key={header} scope="col">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  )
}

export function AdminResultCount({
  page,
  total,
  count,
  noun = 'results',
}: {
  page: number
  total: number
  count: number
  noun?: string
}) {
  return (
    <p className="admin-result-count" role="status">
      {total === 0
        ? `0 ${noun}`
        : `${((page - 1) * 20 + 1).toLocaleString('en-IN')}–${((page - 1) * 20 + count).toLocaleString('en-IN')} of ${total.toLocaleString('en-IN')} ${noun}`}
    </p>
  )
}

export function AdminSearch({
  label,
  value,
  onChange,
  onSearch,
  clearLabel,
  onClear,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  onSearch: () => void
  clearLabel: string
  onClear: () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  return (
    <form
      role="search"
      className="admin-search"
      onSubmit={(event) => {
        event.preventDefault()
        onSearch()
      }}
    >
      <div className="admin-search__field">
        <Search className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
        <input
          ref={inputRef}
          type="search"
          aria-label={label}
          placeholder={label}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
        {value && (
          <button
            type="button"
            className="admin-icon-button"
            aria-label={clearLabel}
            onClick={() => {
              onClear()
              inputRef.current?.focus()
            }}
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      <button type="submit" className="button-secondary">
        Search
      </button>
    </form>
  )
}
