import React, { useMemo, useState } from 'react'
import { Star } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { reviewService } from '../../lib/services/review.service'
import type { ProductReview } from '../../lib/types/product'
import { RatingStars } from '../common/RatingStars'
import { Modal } from '../common/Modal'
import { Button, Dropdown, Textarea } from '../ui'

interface ReviewsSectionProps {
  productId: string
  productName?: string
  ratingAvg: number | null
  reviewCount: number
  reviews: ProductReview[]
  error?: string | null
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

export const ReviewsSection: React.FC<ReviewsSectionProps> = ({
  productId,
  productName,
  ratingAvg,
  reviewCount,
  reviews,
  error,
  onRetry,
  onReviewSubmitted,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [newRating, setNewRating] = useState(5)
  const [hoverRating, setHoverRating] = useState<number | null>(null)
  const [newComment, setNewComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [selectedStarFilter, setSelectedStarFilter] = useState<number | null>(null)
  const [sortOption, setSortOption] = useState<'newest' | 'highest' | 'lowest'>('newest')
  const { isAuthenticated } = useAuth()
  const { showToast } = useToast()

  const distribution = useMemo(() => {
    const counts: Record<1 | 2 | 3 | 4 | 5, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    reviews.forEach((review) => {
      const star = Math.min(5, Math.max(1, Math.round(review.rating))) as 1 | 2 | 3 | 4 | 5
      counts[star] += 1
    })
    return counts
  }, [reviews])

  const filteredReviews = useMemo(() => {
    const list = selectedStarFilter
      ? reviews.filter((review) => Math.round(review.rating) === selectedStarFilter)
      : [...reviews]
    return list.sort((a, b) => {
      if (sortOption === 'highest') return b.rating - a.rating
      if (sortOption === 'lowest') return a.rating - b.rating
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })
  }, [reviews, selectedStarFilter, sortOption])

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

      {error ? (
        <div className="rounded-xl border border-line bg-surface p-5 text-center">
          <p className="text-sm text-ink">Reviews could not be loaded: {error}</p>
          {onRetry && (
            <Button type="button" variant="secondary" size="sm" className="mt-4" onClick={onRetry}>
              Try again
            </Button>
          )}
        </div>
      ) : reviews.length === 0 ? (
        <div className="rounded-xl border border-line bg-surface p-6 text-center text-sm text-muted">
          Be the first verified buyer to review this product.
        </div>
      ) : (
        <>
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant={selectedStarFilter === null ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setSelectedStarFilter(null)}
              >
                All ({reviews.length})
              </Button>
              {([5, 4, 3, 2, 1] as const).map((stars) =>
                distribution[stars] > 0 ? (
                  <Button
                    key={stars}
                    type="button"
                    variant={selectedStarFilter === stars ? 'primary' : 'ghost'}
                    size="sm"
                    onClick={() =>
                      setSelectedStarFilter(selectedStarFilter === stars ? null : stars)
                    }
                  >
                    {stars} stars ({distribution[stars]})
                  </Button>
                ) : null
              )}
            </div>
            <Dropdown
              id="review-sort"
              value={sortOption}
              onChange={(value) => setSortOption(value as typeof sortOption)}
              aria-label="Sort reviews"
              variant="slim"
              className="w-40"
              options={[
                { value: 'newest', label: 'Most recent' },
                { value: 'highest', label: 'Highest rated' },
                { value: 'lowest', label: 'Lowest rated' },
              ]}
            />
          </div>

          {filteredReviews.length === 0 ? (
            <p className="border-t border-line py-8 text-center text-sm text-muted">
              No reviews match this rating.
            </p>
          ) : (
            <div className="divide-y divide-line border-t border-line">
              {filteredReviews.map((review) => (
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
                  <p className="text-sm leading-relaxed text-ink-soft">{review.comment}</p>
                </article>
              ))}
            </div>
          )}
        </>
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
