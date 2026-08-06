import React, { useState } from 'react'
import { CheckCircle, Star } from 'lucide-react'
import type { ProductReview } from '../../lib/types/product'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { reviewService } from '../../lib/services/review.service'
import { Modal } from '../common/Modal'
import { RatingStars } from '../common/RatingStars'

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
    <section className="mt-16 border-t border-line pt-12">
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="editorial-label">Verified purchasers</p>
          <h2 className="editorial-heading mt-3 text-3xl">Customer reviews</h2>
        </div>
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="editorial-button self-start sm:self-auto"
        >
          Write a review
        </button>
      </div>

      <div className="mb-10 grid border-y border-line md:grid-cols-3">
        <div className="border-b border-line py-6 md:border-b-0 md:border-r md:pr-8">
          <span className="font-serif text-5xl font-bold text-ink">
            {ratingAvg ? ratingAvg.toFixed(1) : '—'}
          </span>
          {ratingAvg ? <RatingStars rating={ratingAvg} size="lg" /> : null}
          <span className="mt-2 block text-xs text-muted-ink">Based on {reviewCount} reviews</span>
        </div>
        <p className="py-6 text-sm leading-7 text-muted-ink md:col-span-2 md:pl-8">
          Every review is tied to a delivered and paid order. Your feedback helps other customers
          choose pieces with confidence.
        </p>
      </div>

      <div className="divide-y divide-line">
        {reviews.length === 0 && (
          <p className="py-6 text-sm text-muted-ink">This product does not have any reviews yet.</p>
        )}
        {reviews.map((review) => (
          <article key={review.id} className="py-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-ink">
                  {review.userName || 'Muvira customer'}
                </h3>
                <span className="mt-1 inline-flex items-center gap-1 text-[11px] text-success">
                  <CheckCircle className="h-3 w-3" /> Verified buyer
                </span>
              </div>
              <time className="text-xs text-muted-ink">
                {new Date(review.createdAt).toLocaleDateString('en-IN', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </time>
            </div>
            <div className="mt-3">
              <RatingStars rating={review.rating} size="sm" />
            </div>
            {review.comment && (
              <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-ink">“{review.comment}”</p>
            )}
          </article>
        ))}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Write a review">
        <form onSubmit={handleReviewSubmit} className="space-y-5">
          {!isAuthenticated && (
            <p className="border border-warning bg-warning-soft p-3 text-xs text-warning">
              Sign in with the account used for your purchase to submit a review.
            </p>
          )}
          <div>
            <p className="mb-2 text-xs font-semibold text-ink">Your rating</p>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setNewRating(star)}
                  className="p-1 text-cognac"
                  aria-label={`Rate ${star} out of 5`}
                >
                  <Star className={`h-6 w-6 ${star <= newRating ? 'fill-current' : 'text-line'}`} />
                </button>
              ))}
            </div>
          </div>
          <div>
            <label htmlFor="review-comment" className="mb-2 block text-xs font-semibold text-ink">
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
