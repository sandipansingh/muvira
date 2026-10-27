import React, { useMemo } from 'react'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'

export interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  className?: string
  getPageHref?: (page: number) => string
}

function PageControl({
  page,
  onPageChange,
  getPageHref,
  disabled,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  page: number
  onPageChange: (page: number) => void
  getPageHref?: (page: number) => string
}) {
  if (getPageHref && !disabled) {
    return (
      <a
        href={getPageHref(page)}
        className={props.className}
        aria-label={props['aria-label']}
        aria-current={props['aria-current']}
        onClick={(event) => {
          if (
            event.button !== 0 ||
            event.metaKey ||
            event.ctrlKey ||
            event.shiftKey ||
            event.altKey
          )
            return
          event.preventDefault()
          onPageChange(page)
        }}
      >
        {children}
      </a>
    )
  }
  return (
    <button {...props} type="button" disabled={disabled} onClick={() => onPageChange(page)}>
      {children}
    </button>
  )
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  className = '',
  getPageHref,
}) => {
  const paginationPages = useMemo(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1)
    }

    let startPage = Math.max(2, currentPage - 2)
    let endPage = Math.min(totalPages - 1, currentPage + 2)

    if (currentPage <= 3) {
      startPage = 2
      endPage = 5
    } else if (currentPage >= totalPages - 2) {
      startPage = totalPages - 4
      endPage = totalPages - 1
    }

    const pages: (number | string)[] = [1]

    if (startPage > 2) {
      pages.push('...')
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i)
    }

    if (endPage < totalPages - 1) {
      pages.push('...')
    }

    pages.push(totalPages)

    return pages
  }, [currentPage, totalPages])

  if (totalPages <= 1) return null

  return (
    <nav
      role="navigation"
      aria-label="Pagination Navigation"
      className={`flex max-w-full flex-wrap items-center justify-center gap-2 mx-auto ${className}`}
    >
      <PageControl
        type="button"
        page={1}
        onPageChange={onPageChange}
        getPageHref={getPageHref}
        disabled={currentPage === 1}
        className="w-11 h-11 rounded-full flex items-center justify-center text-ink hover:bg-surface disabled:opacity-30 disabled:hover:bg-transparent transition-all duration-200 cursor-pointer disabled:cursor-not-allowed select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
        aria-label="Go to first page"
      >
        <ChevronsLeft className="w-4 h-4 stroke-[2]" />
      </PageControl>

      <PageControl
        type="button"
        page={Math.max(currentPage - 1, 1)}
        onPageChange={onPageChange}
        getPageHref={getPageHref}
        disabled={currentPage === 1}
        className="w-11 h-11 rounded-full flex items-center justify-center text-ink hover:bg-surface disabled:opacity-30 disabled:hover:bg-transparent transition-all duration-200 cursor-pointer disabled:cursor-not-allowed select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
        aria-label="Go to previous page"
      >
        <ChevronLeft className="w-4 h-4 stroke-[2]" />
      </PageControl>

      {paginationPages.map((page, idx) => {
        if (page === '...') {
          return (
            <span
              key={`ellipsis-${idx}`}
              className="w-11 h-11 flex items-center justify-center text-muted font-normal text-sm select-none"
              aria-hidden="true"
            >
              ...
            </span>
          )
        }

        const isPageActive = page === currentPage

        return (
          <PageControl
            key={`page-${page}`}
            type="button"
            page={Number(page)}
            onPageChange={onPageChange}
            getPageHref={getPageHref}
            aria-label={`Go to page ${page}`}
            aria-current={isPageActive ? 'page' : undefined}
            className={`w-11 h-11 rounded-full flex items-center justify-center text-sm transition-all duration-200 select-none cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 ${
              isPageActive
                ? 'bg-primary text-white font-normal shadow-sm scale-105 hover:bg-primary-hover'
                : 'text-ink font-normal hover:bg-surface'
            }`}
          >
            {page}
          </PageControl>
        )
      })}

      <PageControl
        type="button"
        page={Math.min(currentPage + 1, totalPages)}
        onPageChange={onPageChange}
        getPageHref={getPageHref}
        disabled={currentPage === totalPages}
        className="w-11 h-11 rounded-full flex items-center justify-center text-ink hover:bg-surface disabled:opacity-30 disabled:hover:bg-transparent transition-all duration-200 cursor-pointer disabled:cursor-not-allowed select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
        aria-label="Go to next page"
      >
        <ChevronRight className="w-4 h-4 stroke-[2]" />
      </PageControl>

      <PageControl
        type="button"
        page={totalPages}
        onPageChange={onPageChange}
        getPageHref={getPageHref}
        disabled={currentPage === totalPages}
        className="w-11 h-11 rounded-full flex items-center justify-center text-ink hover:bg-surface disabled:opacity-30 disabled:hover:bg-transparent transition-all duration-200 cursor-pointer disabled:cursor-not-allowed select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
        aria-label="Go to last page"
      >
        <ChevronsRight className="w-4 h-4 stroke-[2]" />
      </PageControl>
    </nav>
  )
}

export default Pagination
