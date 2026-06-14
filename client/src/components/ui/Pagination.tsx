import React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import Button from './Button'

interface PaginationProps {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
}

export const Pagination: React.FC<PaginationProps> = ({ page, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null

  const renderPageNumbers = () => {
    const pages = []
    const maxVisiblePages = 5
    let startPage = Math.max(1, page - Math.floor(maxVisiblePages / 2))
    let endPage = startPage + maxVisiblePages - 1

    if (endPage > totalPages) {
      endPage = totalPages
      startPage = Math.max(1, endPage - maxVisiblePages + 1)
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <Button
          key={i}
          variant={page === i ? 'primary' : 'ghost'}
          size="sm"
          pill={true}
          onClick={() => onPageChange(i)}
          className={`w-9 h-9 !p-0 ${
            page === i
              ? 'bg-primaryBg text-white'
              : 'text-secondary600 hover:text-darkColor hover:bg-lightgrayColor'
          }`}
        >
          {i}
        </Button>
      )
    }
    return pages
  }

  return (
    <div className="flex items-center justify-center gap-2 mt-8 py-4">
      {/* Previous Button */}
      <Button
        variant="outline"
        size="sm"
        pill={true}
        disabled={page === 1}
        onClick={() => onPageChange(page - 1)}
        className="w-9 h-9 !p-0 flex items-center justify-center border-secondary300 text-secondary600 disabled:opacity-40"
      >
        <ChevronLeft className="w-5 h-5" />
      </Button>

      {/* Pages numbered pills */}
      <div className="flex items-center gap-1.5">{renderPageNumbers()}</div>

      {/* Next Button */}
      <Button
        variant="outline"
        size="sm"
        pill={true}
        disabled={page === totalPages}
        onClick={() => onPageChange(page + 1)}
        className="w-9 h-9 !p-0 flex items-center justify-center border-secondary300 text-secondary600 disabled:opacity-40"
      >
        <ChevronRight className="w-5 h-5" />
      </Button>
    </div>
  )
}

export default Pagination
