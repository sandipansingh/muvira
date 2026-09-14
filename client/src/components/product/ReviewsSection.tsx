import React, { useState } from 'react'
import { Star } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { reviewService } from '../../lib/services/review.service'
import type { ProductReview } from '../../lib/types/product'
import { reviewDisplayState } from '../../lib/utils/reviewState'
import { RatingStars } from '../common/RatingStars'
import { Modal } from '../common/Modal'
import { Button, Textarea } from '../ui'

interface ProductReviewsProps {
  productId: string
  productName?: string
  ratingAvg: number | null
  reviewCount: number
  reviews: ProductReview[]
  error?: string | null
  hasMore?: boolean
  loadingMore?: boolean
  onLoadMore?: () => Promise<void>
  onRetry?: () => Promise<void>
  onReviewSubmitted?: () => Promise<void>
}

const formatReviewDate = (dateString?: string) => {
  if (!dateString) return 'Date unavailable'
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return 'Date unavailable'
  return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })
}

const ratingLabels: Record<number, string> = {
  5: 'Exceptional',
  4: 'Great',
  3: 'Average',
  2: 'Fair',
  1: 'Poor',
}

export const ReviewsSection: React.FC<ProductReviewsProps> = ({
  productId,
  productName,
  ratingAvg,
  reviewCount,
  reviews,
  error,
  hasMore = false,
  loadingMore = false,
  onLoadMore,
  onRetry,
  onReviewSubmitted,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [newRating, setNewRating] = useState(5)
  const [hoverRating, setHoverRating] = useState<number | null>(null)
  const [newComment, setNewComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const { isAuthenticated } = useAuth()
  const { showToast } = useToast()
  const displayState = reviewDisplayState(reviews, error)

  const handleReviewSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!isAuthenticated) {
      showToast('Please sign in to write a review.', 'info')
      return
    }
    if (!newComment.trim()) {
      showToast('Please provide a review comment.', 'info')
      return
    }

    setSubmitting(true)
    try {
      const response = await reviewService.submitReview(productId, newRating, newComment.trim())
      if (!response.success) throw new Error(response.error.message)
      showToast('Your review has been submitted.', 'success')
      setIsModalOpen(false)
      setNewComment('')
      setNewRating(5)
      await onReviewSubmitted?.()
    } catch (reason) {
      showToast(reason instanceof Error ? reason.message : 'Unable to save review.', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6 py-4">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <h3 className="font-display text-xl font-semibold leading-tight text-ink">
            Customer reviews
          </h3>
          {ratingAvg !== null && reviewCount > 0 ? (
            <div className="mt-2 flex items-center gap-2">
              <RatingStars rating={ratingAvg} size="sm" />
              <span className="text-sm text-ink">
                {ratingAvg.toFixed(1)} from {reviewCount} verified{' '}
                {reviewCount === 1 ? 'review' : 'reviews'}
              </span>
            </div>
          ) : (
            <p className="mt-2 text-sm text-muted">No reviews have been published yet.</p>
          )}
        </div>
        <Button type="button" variant="secondary" onClick={() => setIsModalOpen(true)}>
          Write a review
        </Button>
      </div>

      {displayState === 'error' ? (
        <div className="rounded-xl border border-line bg-surface p-5 text-center">
          <p className="text-sm text-ink">Reviews could not be loaded: {error}</p>
          {onRetry && (
            <Button type="button" variant="secondary" size="sm" className="mt-4" onClick={onRetry}>
              Try again
            </Button>
          )}
        </div>
      ) : displayState === 'empty' ? (
        <div className="rounded-xl border border-line bg-surface p-6 text-center text-sm text-muted">
          Be the first verified buyer to review this product.
        </div>
      ) : (
        <div>
          {displayState === 'partial-error' && (
            <div className="mb-4 rounded-xl border border-warning/30 bg-warning-soft p-4 text-sm text-warning">
              More reviews could not be loaded: {error}
            </div>
          )}
          <div className="divide-y divide-line border-t border-line">
            {reviews.map((review) => (
              <article key={review.id} className="space-y-3 py-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h4 className="font-display text-base font-semibold text-ink">
                      {review.userName || 'Verified buyer'}
                    </h4>
                    <div className="mt-1 flex items-center gap-2">
                      <RatingStars rating={review.rating} size="xs" />
                      <span className="text-xs font-bold text-accent">Verified purchase</span>
                    </div>
                  </div>
                  <span className="text-xs text-muted">{formatReviewDate(review.createdAt)}</span>
                </div>
                {review.comment && (
                  <p className="text-sm leading-relaxed text-ink-soft">{review.comment}</p>
                )}
              </article>
            ))}
          </div>
          {hasMore && onLoadMore && (
            <div className="pt-4 text-center">
              <Button
                type="button"
                variant="secondary"
                isLoading={loadingMore}
                onClick={onLoadMore}
              >
                Load more reviews
              </Button>
            </div>
          )}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Write a review">
        <form onSubmit={handleReviewSubmit} className="space-y-5">
          {!isAuthenticated && (
            <div className="rounded-lg border border-warning/30 bg-warning-soft p-3.5 text-sm text-warning">
              Sign in with the account used for your purchase to submit a verified review.
            </div>
          )}
          {productName && <p className="text-sm font-bold text-ink">{productName}</p>}
          <div>
            <span className="mb-2 block text-xs uppercase tracking-wider text-ink-soft">
              Overall rating
            </span>
            <div className="flex flex-wrap items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => {
                const isFilled = star <= (hoverRating ?? newRating)
                return (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setNewRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(null)}
                    className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg border border-line transition-transform hover:scale-105"
                    aria-label={`Rate ${star} out of 5 stars`}
                  >
                    <Star
                      className={`h-5 w-5 ${
                        isFilled ? 'fill-rating text-rating' : 'fill-line text-disabled'
                      }`}
                    />
                  </button>
                )
              })}
              <span className="text-sm text-ink-soft">
                {ratingLabels[hoverRating ?? newRating]} ({hoverRating ?? newRating}/5)
              </span>
            </div>
          </div>
          <Textarea
            id="review-comment"
            name="comment"
            rows={4}
            required
            value={newComment}
            onChange={(event) => setNewComment(event.target.value)}
            placeholder="Share your experience with this product."
          />
          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={submitting}
            disabled={submitting || !isAuthenticated}
            className="w-full"
          >
            Submit review
          </Button>
        </form>
      </Modal>
    </div>
  )
}

export default ReviewsSection
