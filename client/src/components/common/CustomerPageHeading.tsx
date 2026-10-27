import type { ReactNode } from 'react'

interface CustomerPageHeadingProps {
  eyebrow: string
  title: string
  description?: string
  children?: ReactNode
}

export function CustomerPageHeading({
  eyebrow,
  title,
  description,
  children,
}: CustomerPageHeadingProps) {
  return (
    <header className="customer-heading">
      <div className="min-w-0">
        <span className="eyebrow mb-3 block">{eyebrow}</span>
        <h1 className="page-title">{title}</h1>
        {description && <p className="mt-3 text-base leading-7 text-ink-soft">{description}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-3">{children}</div>}
    </header>
  )
}
