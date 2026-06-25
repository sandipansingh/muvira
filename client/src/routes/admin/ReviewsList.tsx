import React, { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { adminApiService } from '../../lib/api/admin'
import { formatDate } from '../../lib/format'
import Card from '../../components/ui/Card'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '../../components/ui/Table'
import Pagination from '../../components/ui/Pagination'
import Skeleton from '../../components/ui/Skeleton'
import ErrorState from '../../components/shared/ErrorState'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'
import { Dialog } from '../../components/ui/Dialog'
import { useToast } from '../../hooks/useToast'
import { Star, Search, Trash2, ExternalLink } from 'lucide-react'

interface AdminReview {
  id: string
  productId: string
  productName: string
  productSlug: string
  userId: string
  userName: string
  userEmail: string
  rating: number
  comment: string | null
  createdAt: string
  updatedAt: string
}

export const ReviewsList: React.FC = () => {
  const [reviews, setReviews] = useState<AdminReview[]>([])
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [q, setQ] = useState('')
  const [ratingFilter, setRatingFilter] = useState('')
  const [page, setPage] = useState(1)

  const [deleteTarget, setDeleteTarget] = useState<AdminReview | null>(null)
  const [deleting, setDeleting] = useState(false)

  const { showToast } = useToast()

  const fetchReviews = useCallback(async () => {
    setLoading(true)
    setError(null)

    const params: Record<string, string | number> = { page, limit: 20 }
    if (q) params.q = q
    if (ratingFilter) params.rating = parseInt(ratingFilter, 10)

    const res = await adminApiService.getReviews(params)
    if (res.success) {
      setReviews(res.data as AdminReview[])
      setPagination(res.pagination)
    } else {
      setError(res.error.message || 'Failed to load reviews.')
    }
    setLoading(false)
  }, [page, q, ratingFilter])

  useEffect(() => {
    fetchReviews()
  }, [fetchReviews])

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    const res = await adminApiService.deleteReview(deleteTarget.id)
    setDeleting(false)
    if (res.success) {
      showToast('Review deleted.', 'success')
      setDeleteTarget(null)
      fetchReviews()
    } else {
      showToast(res.error.message || 'Delete failed.', 'error')
    }
  }

  const renderStars = (rating: number) => (
    <div className="flex text-primaryBg">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`w-3.5 h-3.5 ${i + 1 <= rating ? 'fill-current' : ''}`}
          strokeWidth={1.5}
        />
      ))}
    </div>
  )

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl md:text-2xl font-medium tracking-wide text-darkColor">Reviews</h2>
        <p className="text-xs text-secondary500 mt-1">
          Manage customer ratings and comments. Only verified delivered buyers can post.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-secondary400" />
            <Input
              placeholder="Search by comment or product..."
              value={q}
              onChange={(e) => {
                setQ(e.target.value)
                setPage(1)
              }}
              className="pl-9"
            />
          </div>
        </div>
        <div className="w-40">
          <Select
            value={ratingFilter}
            onChange={(e) => {
              setRatingFilter(e.target.value)
              setPage(1)
            }}
            options={[
              { value: '', label: 'All ratings' },
              { value: '5', label: '5 stars' },
              { value: '4', label: '4 stars' },
              { value: '3', label: '3 stars' },
              { value: '2', label: '2 stars' },
              { value: '1', label: '1 star' },
            ]}
          />
        </div>
        <Button
          variant="outline"
          onClick={() => {
            setQ('')
            setRatingFilter('')
            setPage(1)
          }}
        >
          Clear
        </Button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={fetchReviews} />
      ) : reviews.length === 0 ? (
        <Card className="p-8 text-center text-secondary500">No reviews found.</Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Reviewer</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Comment</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="w-20 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reviews.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <Link
                        to={`/products/${r.productSlug}`}
                        target="_blank"
                        className="font-medium hover:underline inline-flex items-center gap-1"
                      >
                        {r.productName || r.productId}
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{r.userName || '—'}</div>
                      <div className="text-[10px] text-secondary400">{r.userEmail}</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {renderStars(r.rating)}
                        <span className="text-xs text-secondary500">{r.rating}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs text-secondary700 max-w-[360px] line-clamp-3">
                        {r.comment || (
                          <span className="italic text-secondary400">(no comment)</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-secondary500 whitespace-nowrap">
                      {formatDate(r.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setDeleteTarget(r)}
                        className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="border-t p-3">
            <Pagination
              page={pagination.page}
              totalPages={pagination.totalPages}
              onPageChange={(p) => setPage(p)}
            />
          </div>
        </Card>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Review?">
        <div className="space-y-3 text-sm">
          <p>This will permanently remove the review and comment from the product page.</p>
          {deleteTarget && (
            <div className="bg-lightgrayColor p-3 rounded text-xs">
              <div>
                <strong>Product:</strong> {deleteTarget.productName}
              </div>
              <div>
                <strong>Rating:</strong> {deleteTarget.rating} ★
              </div>
              {deleteTarget.comment && (
                <div className="mt-1">
                  <strong>Comment:</strong> {deleteTarget.comment}
                </div>
              )}
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button
              onClick={handleDelete}
              loading={deleting}
              className="bg-rose-600 hover:bg-rose-700"
            >
              Delete Review
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  )
}

export default ReviewsList
