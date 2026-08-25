import React, { useMemo } from 'react'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'

export interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  className?: string
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  className = '',
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
      className={`flex items-center justify-center gap-1 max-w-fit mx-auto ${className}`}
    >
      <button
        type="button"
        onClick={() => onPageChange(1)}
        disabled={currentPage === 1}
        className="w-8 h-8 rounded-full flex items-center justify-center text-ink hover:bg-surface disabled:opacity-30 disabled:hover:bg-transparent transition-all duration-200 cursor-pointer disabled:cursor-not-allowed select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
        aria-label="Go to first page"
      >
        <ChevronsLeft className="w-4 h-4 stroke-[2]" />
      </button>

      <button
        type="button"
        onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
        disabled={currentPage === 1}
        className="w-8 h-8 rounded-full flex items-center justify-center text-ink hover:bg-surface disabled:opacity-30 disabled:hover:bg-transparent transition-all duration-200 cursor-pointer disabled:cursor-not-allowed select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
        aria-label="Go to previous page"
      >
        <ChevronLeft className="w-4 h-4 stroke-[2]" />
      </button>

      {paginationPages.map((page, idx) => {
        if (page === '...') {
          return (
            <span
              key={`ellipsis-${idx}`}
              className="w-8 h-8 flex items-center justify-center text-muted font-normal text-xs select-none"
              aria-hidden="true"
            >
              ...
            </span>
          )
        }

        const isPageActive = page === currentPage

        return (
          <button
            key={`page-${page}`}
            type="button"
            onClick={() => onPageChange(Number(page))}
            aria-label={`Go to page ${page}`}
            aria-current={isPageActive ? 'page' : undefined}
            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs transition-all duration-200 select-none cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 ${
              isPageActive
                ? 'bg-primary text-white font-normal shadow-sm scale-105 hover:bg-primary-hover'
                : 'text-ink font-normal hover:bg-surface'
            }`}
          >
            {page}
          </button>
        )
      })}

      <button
        type="button"
        onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
        disabled={currentPage === totalPages}
        className="w-8 h-8 rounded-full flex items-center justify-center text-ink hover:bg-surface disabled:opacity-30 disabled:hover:bg-transparent transition-all duration-200 cursor-pointer disabled:cursor-not-allowed select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
        aria-label="Go to next page"
      >
        <ChevronRight className="w-4 h-4 stroke-[2]" />
      </button>

      <button
        type="button"
        onClick={() => onPageChange(totalPages)}
        disabled={currentPage === totalPages}
        className="w-8 h-8 rounded-full flex items-center justify-center text-ink hover:bg-surface disabled:opacity-30 disabled:hover:bg-transparent transition-all duration-200 cursor-pointer disabled:cursor-not-allowed select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
        aria-label="Go to last page"
      >
        <ChevronsRight className="w-4 h-4 stroke-[2]" />
      </button>
    </nav>
  )
}

export default Pagination
