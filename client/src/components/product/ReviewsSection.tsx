import React, { useState } from 'react'
import { Star, ThumbsUp } from 'lucide-react'
import type { ProductReview } from '../../lib/types/product'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { reviewService } from '../../lib/services/review.service'
import { RatingStars } from '../common/RatingStars'
import { Modal } from '../common/Modal'

interface ReviewsSectionProps {
  productId: string
  productName?: string
  ratingAvg: number | null
  reviewCount: number
  reviews: ProductReview[]
  onReviewSubmitted?: () => Promise<void>
}

/* Reviewer avatars matching design reference aesthetics */
const sampleAvatars = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=120&q=80',
]

const reactionEmojis = ['❤️', '👏', '👍', '😄', '😮']

export const ReviewsSection: React.FC<ReviewsSectionProps> = ({
  productId,
  productName = 'Tray Table',
  ratingAvg,
  reviewCount,
  reviews,
  onReviewSubmitted,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [newRating, setNewRating] = useState(5)
  const [newComment, setNewComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [sortOption, setSortOption] = useState('Newest')
  const [visibleCount, setVisibleCount] = useState(5)
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
        showToast('Your review has been submitted successfully.', 'success')
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

  const effectiveRating = ratingAvg ?? 5
  const totalReviewDisplay = reviewCount || 11

  /* Fallback mock reviews matching design reference */
  const displayReviews =
    reviews.length > 0
      ? reviews
      : [
          {
            id: 'mock-1',
            productId,
            userId: 'u1',
            userName: 'Sofia Harvertz',
            rating: 5,
            comment:
              'I bought it 3 weeks ago and now come back just to say "Awesome Product!". I really enjoy it. At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium voluptatum deleniti atque corrupti quos dolores et quas molestias excepturi sint non provident.',
            createdAt: new Date().toISOString(),
          },
          {
            id: 'mock-2',
            productId,
            userId: 'u2',
            userName: 'Nicolas Jensen',
            rating: 5,
            comment:
              'I bought it 3 weeks ago and now come back just to say "Awesome Product!". I really enjoy it. At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium voluptatum deleniti atque corrupti quos dolores et quas molestias excepturi sint non provident.',
            createdAt: new Date().toISOString(),
          },
          {
            id: 'mock-3',
            productId,
            userId: 'u3',
            userName: 'Nicolas Jensen',
            rating: 5,
            comment:
              'I bought it 3 weeks ago and now come back just to say "Awesome Product!". I really enjoy it. At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium voluptatum deleniti atque corrupti quos dolores et quas molestias excepturi sint non provident.',
            createdAt: new Date().toISOString(),
          },
          {
            id: 'mock-4',
            productId,
            userId: 'u4',
            userName: 'Nicolas Jensen',
            rating: 5,
            comment:
              'I bought it 3 weeks ago and now come back just to say "Awesome Product!". I really enjoy it. At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium voluptatum deleniti atque corrupti quos dolores et quas molestias excepturi sint non provident.',
            createdAt: new Date().toISOString(),
          },
          {
            id: 'mock-5',
            productId,
            userId: 'u5',
            userName: 'Nicolas Jensen',
            rating: 5,
            comment:
              'I bought it 3 weeks ago and now come back just to say "Awesome Product!". I really enjoy it. At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium voluptatum deleniti atque corrupti quos dolores et quas molestias excepturi sint non provident.',
            createdAt: new Date().toISOString(),
          },
        ]

  return (
    <div className="py-6">
      {/* Customer Reviews Heading & Rating Info */}
      <div className="space-y-1">
        <h3 className="font-display text-2xl font-bold tracking-tight text-[var(--kit-ink)] sm:text-3xl">
          Customer Reviews
        </h3>
        <div className="flex items-center gap-2 pt-1">
          <RatingStars rating={effectiveRating} size="sm" />
          <span className="text-xs font-semibold text-[var(--kit-ink)]">
            {totalReviewDisplay} Reviews
          </span>
        </div>
        <p className="text-xs text-[var(--kit-muted)]">{productName}</p>
      </div>

      {/* Write Review Pill Card with Reactions & Button */}
      <div className="mt-6 flex flex-col gap-3 rounded-2xl sm:rounded-full border border-[var(--kit-line)] bg-white p-2.5 sm:flex-row sm:items-center sm:justify-between shadow-xs">
        <input
          type="text"
          placeholder="Write your review..."
          onClick={() => setIsModalOpen(true)}
          readOnly
          className="w-full bg-transparent px-3 text-sm sm:text-base text-[var(--kit-ink)] placeholder-[var(--kit-muted)] outline-none cursor-pointer"
        />
        <div className="flex items-center justify-between sm:justify-end gap-3 px-2 sm:px-0">
          <div className="flex items-center gap-1.5 text-base">
            {reactionEmojis.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="cursor-pointer transition-transform hover:scale-125"
                aria-label={`React with ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="rounded-full bg-[#141718] px-5 py-2 text-xs font-semibold text-white transition-colors hover:bg-black cursor-pointer whitespace-nowrap"
          >
            Write Review
          </button>
        </div>
      </div>

      {/* Review Count & Sort Header */}
      <div className="mt-10 flex items-center justify-between border-b border-[var(--kit-line)] pb-4">
        <h4 className="font-display text-xl sm:text-2xl font-bold text-[var(--kit-ink)]">
          {displayReviews.length} Reviews
        </h4>
        <div className="relative">
          <select
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value)}
            className="cursor-pointer rounded-lg border border-[var(--kit-line)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--kit-ink)] outline-none"
            aria-label="Sort reviews"
          >
            <option value="Newest">Newest</option>
            <option value="Highest">Highest Rating</option>
            <option value="Lowest">Lowest Rating</option>
          </select>
        </div>
      </div>

      {/* Reviews List */}
      <div className="divide-y divide-[var(--kit-line)]">
        {displayReviews.slice(0, visibleCount).map((review, idx) => (
          <article key={review.id} className="py-6 sm:py-8">
            <div className="flex items-start gap-4 sm:gap-6">
              <img
                src={sampleAvatars[idx % sampleAvatars.length]}
                alt={review.userName || 'Reviewer'}
                className="h-12 w-12 sm:h-14 sm:w-14 rounded-full object-cover shrink-0"
              />
              <div className="space-y-2 flex-1 min-w-0">
                <h5 className="font-display text-base font-bold text-[var(--kit-ink)]">
                  {review.userName || 'Customer'}
                </h5>
                <RatingStars rating={review.rating} size="xs" />
                <p className="pt-1 text-sm leading-relaxed text-[var(--kit-muted)] sm:text-base">
                  {review.comment}
                </p>

                {/* Like & Reply Action links */}
                <div className="flex items-center gap-5 pt-2 text-xs font-semibold text-[var(--kit-muted)]">
                  <button
                    type="button"
                    className="flex cursor-pointer items-center gap-1.5 leading-none transition-colors hover:text-[var(--kit-ink)]"
                  >
                    <ThumbsUp className="h-3.5 w-3.5 shrink-0" />
                    <span className="leading-none">Like</span>
                  </button>
                  <button
                    type="button"
                    className="hover:text-[var(--kit-ink)] transition-colors cursor-pointer"
                  >
                    Reply
                  </button>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>

      {/* Load More Button */}
      {visibleCount < displayReviews.length && (
        <div className="mt-8 flex justify-center pb-4">
          <button
            type="button"
            onClick={() => setVisibleCount((prev) => prev + 5)}
            className="rounded-full border border-[var(--kit-ink)] px-8 py-2.5 text-sm font-semibold text-[var(--kit-ink)] transition-colors hover:bg-[var(--kit-ink)] hover:text-white cursor-pointer"
          >
            Load more
          </button>
        </div>
      )}

      {/* Modal Form for Writing a Review */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Write a review">
        <form onSubmit={handleReviewSubmit} className="space-y-6">
          {!isAuthenticated && (
            <p className="text-sm text-amber-600">
              Sign in with the account used for your purchase to submit a review.
            </p>
          )}
          <div>
            <p className="mb-2 text-sm font-semibold text-[var(--kit-ink)]">Your rating</p>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setNewRating(star)}
                  className="min-h-11 min-w-11 p-2 text-[var(--kit-ink)] cursor-pointer"
                  aria-label={`Rate ${star} out of 5`}
                >
                  <Star
                    className={`h-6 w-6 ${star <= newRating ? 'fill-current' : 'text-neutral-300'}`}
                  />
                </button>
              ))}
            </div>
          </div>
          <div>
            <label
              htmlFor="review-comment"
              className="mb-2 block text-sm font-semibold text-[var(--kit-ink)]"
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
            className="kit-button w-full cursor-pointer"
          >
            {submitting ? 'Saving review...' : 'Submit review'}
          </button>
        </form>
      </Modal>
    </div>
  )
}

export default ReviewsSection
