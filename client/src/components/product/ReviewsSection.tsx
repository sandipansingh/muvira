import React, { useState } from 'react'
import { Star } from 'lucide-react'
import type { ProductReview } from '../../lib/types/product'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { reviewService } from '../../lib/services/review.service'
import { Modal } from '../common/Modal'

interface ReviewsSectionProps {
  productId: string
  ratingAvg: number | null
  reviewCount: number
  reviews: ProductReview[]
  onReviewSubmitted?: () => Promise<void>
}

export const ReviewsSection: React.FC<ReviewsSectionProps> = ({
  productId,
  ratingAvg,
  reviewCount,
  reviews,
  onReviewSubmitted,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [newRating, setNewRating] = useState(5)
  const [newComment, setNewComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const { isAuthenticated } = useAuth()
  const { showToast } = useToast()

  const handleReviewSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!isAuthenticated) {
      showToast('Please sign in to write a review.', 'info')
      return
    }
    setSubmitting(true)
    try {
      const response = await reviewService.submitReview(productId, newRating, newComment.trim())
      if (response.success) {
        showToast('Your verified-purchase review has been saved.', 'success')
        setIsModalOpen(false)
        setNewComment('')
        await onReviewSubmitted?.()
      } else {
        showToast(response.error.message, 'error')
      }
    } catch (reason) {
      showToast(reason instanceof Error ? reason.message : 'Unable to save review.', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="mt-space-16 border-t border-rule pt-space-12">
      <div className="mb-space-8 flex flex-col justify-between gap-space-4 sm:flex-row sm:items-end">
        <div>
          <p className="editorial-label">Reviews</p>
          <h2 className="editorial-heading mt-space-2 text-heading-m-mobile sm:text-heading-m-desktop">
            Customer reviews
          </h2>
        </div>
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="editorial-link self-start border-0 bg-transparent p-0 sm:self-auto"
        >
          Write a review
        </button>
      </div>

      <div className="mb-space-12 grid border-y border-rule md:grid-cols-3">
        <div className="border-b border-rule py-space-6 md:border-b-0 md:border-r md:pr-space-8">
          <span className="font-display text-heading-m-mobile font-semibold text-ink sm:text-heading-m-desktop">
            {ratingAvg ? ratingAvg.toFixed(1) : '—'}
          </span>
          {ratingAvg ? <span className="ml-space-2 text-ui text-muted">out of 5</span> : null}
          <span className="mt-space-2 block text-ui text-muted">
            Based on {reviewCount} reviews
          </span>
        </div>
        <p className="py-space-6 text-body text-muted md:col-span-2 md:pl-space-8">
          Every review is tied to a delivered and paid order. Your feedback helps other customers
          choose pieces with confidence.
        </p>
      </div>

      <div className="divide-y divide-rule">
        {reviews.length === 0 && (
          <p className="py-space-6 text-body text-muted">
            This product does not have any reviews yet.
          </p>
        )}
        {reviews.map((review) => (
          <article key={review.id} className="py-space-6">
            <div className="flex items-start justify-between gap-space-3">
              <div>
                <h3 className="text-body font-semibold text-ink">
                  {review.userName || 'Muvira customer'}
                </h3>
              </div>
              <time className="text-ui text-muted">
                {new Date(review.createdAt).toLocaleDateString('en-IN', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </time>
            </div>
            <p className="mt-space-2 text-ui font-semibold text-ink">{review.rating} out of 5</p>
            {review.comment && (
              <p className="mt-space-3 max-w-2xl text-body text-muted">“{review.comment}”</p>
            )}
          </article>
        ))}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Write a review">
        <form onSubmit={handleReviewSubmit} className="space-y-space-6">
          {!isAuthenticated && (
            <p className="text-ui text-warning">
              Sign in with the account used for your purchase to submit a review.
            </p>
          )}
          <div>
            <p className="mb-space-2 text-ui font-semibold text-ink">Your rating</p>
            <div className="flex gap-space-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setNewRating(star)}
                  className="min-h-11 min-w-11 p-space-2 text-terracotta"
                  aria-label={`Rate ${star} out of 5`}
                >
                  <Star className={`h-6 w-6 ${star <= newRating ? 'fill-current' : 'text-line'}`} />
                </button>
              ))}
            </div>
          </div>
          <div>
            <label
              htmlFor="review-comment"
              className="mb-space-2 block text-ui font-semibold text-ink"
            >
              Review
            </label>
            <textarea
              id="review-comment"
              name="comment"
              rows={4}
              value={newComment}
              onChange={(event) => setNewComment(event.target.value)}
              placeholder="Tell us about the craftsmanship, comfort, and delivery..."
              className="editorial-input"
            />
          </div>
          <button
            type="submit"
            disabled={submitting || !isAuthenticated}
            className="editorial-button w-full"
          >
            {submitting ? 'Saving review...' : 'Submit review'}
          </button>
        </form>
      </Modal>
    </section>
  )
}
