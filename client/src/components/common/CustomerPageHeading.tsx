import type { ReactNode } from 'react'
import { Breadcrumbs, type BreadcrumbItem } from './Breadcrumbs'

interface CustomerPageHeadingProps {
  title: string
  description?: string
  breadcrumbs?: BreadcrumbItem[]
  actions?: ReactNode
  children?: ReactNode
}

export function CustomerPageHeading({
  title,
  description,
  breadcrumbs,
  actions,
  children,
}: CustomerPageHeadingProps) {
  return (
    <header className="customer-heading">
      {breadcrumbs && <Breadcrumbs items={breadcrumbs} />}
      <div className="customer-heading__row">
        <div className="min-w-0">
          <h1 className="page-title">{title}</h1>
          {description && (
            <p className="mt-3 max-w-2xl text-base leading-7 text-ink-soft">{description}</p>
          )}
        </div>
        {(actions || children) && (
          <div className="customer-heading__actions flex flex-wrap items-center gap-3">
            {actions}
            {children}
          </div>
        )}
      </div>
    </header>
  )
}
