import React from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'

export interface BreadcrumbItem {
  label: string
  path?: string
}

interface BreadcrumbProps {
  items: BreadcrumbItem[]
  className?: string
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({ items, className = '' }) => {
  return (
    <nav
      className={`flex items-center gap-1.5 py-3 text-xs md:text-sm text-secondary500 tracking-wide select-none ${className}`}
    >
      <Link to="/" className="hover:text-primaryBg transition-colors">
        Home
      </Link>
      {items.map((item, idx) => (
        <React.Fragment key={idx}>
          <ChevronRight className="w-3.5 h-3.5 text-secondary400 shrink-0" />
          {item.path && idx < items.length - 1 ? (
            <Link to={item.path} className="hover:text-primaryBg transition-colors hover:underline">
              {item.label}
            </Link>
          ) : (
            <span className="text-secondary700 font-medium truncate max-w-[150px] md:max-w-none">
              {item.label}
            </span>
          )}
        </React.Fragment>
      ))}
    </nav>
  )
}

export default Breadcrumb
