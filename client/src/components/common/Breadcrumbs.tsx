import React from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'

export interface BreadcrumbItem {
  label: string
  href?: string
}

export interface BreadcrumbsProps {
  items: BreadcrumbItem[]
  className?: string
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ items, className = '' }) => {
  if (!items || items.length === 0) return null

  return (
    <nav
      className={`mb-4 flex flex-wrap items-center gap-1.5 text-sm font-normal text-muted ${className}`}
      aria-label="Breadcrumb"
    >
      {items.map((item, idx) => {
        const isLast = idx === items.length - 1
        return (
          <React.Fragment key={idx}>
            {idx > 0 && <ChevronRight className="h-3 w-3 shrink-0 text-muted" aria-hidden="true" />}
            {isLast || !item.href ? (
              <span
                className="min-w-0 break-words font-normal text-ink [overflow-wrap:anywhere]"
                aria-current={isLast ? 'page' : undefined}
              >
                {item.label}
              </span>
            ) : (
              <Link
                to={item.href}
                className="inline-flex min-h-[var(--tap-target)] min-w-[var(--tap-target)] items-center break-words transition-colors hover:text-primary [overflow-wrap:anywhere]"
              >
                {item.label}
              </Link>
            )}
          </React.Fragment>
        )
      })}
    </nav>
  )
}

export default Breadcrumbs
