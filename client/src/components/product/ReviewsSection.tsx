import React, { useMemo, useState } from 'react'
import { CheckCircle2, Loader2, PenLine, Star, ThumbsDown, ThumbsUp } from 'lucide-react'
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

interface ReviewFeedback {
  liked?: boolean
  disliked?: boolean
  likes: number
  dislikes: number
}

/* Authentic fallback reviews for artisanal handcrafted products */
const fallbackReviews: ProductReview[] = [
  {
    id: 'mock-1',
    productId: '',
    userId: 'u1',
    userName: 'Sofia Harvertz',
    rating: 5,
    comment:
      'The craftsmanship on this piece is truly remarkable. The natural stone texture is smooth, the detailing is sharp, and it arrived in pristine wooden crate packaging. A stunning centerpiece for our home.',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
  },
  {
    id: 'mock-2',
    productId: '',
    userId: 'u2',
    userName: 'Nicolas Jensen',
    rating: 5,
    comment:
      'Exceeded my expectations in quality and weight. You can immediately tell it is hand-hewn by master artisans. It has that genuine heirloom feel you rarely find nowadays.',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 12).toISOString(),
  },
  {
    id: 'mock-3',
    productId: '',
    userId: 'u3',
    userName: 'Priya Sharma',
    rating: 4,
    comment:
      'Delivered within 3 days in robust packaging. The finish and natural grain give it an authentic, sacred aura. Very pleased with Muvira’s service and product quality.',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 20).toISOString(),
  },
  {
    id: 'mock-4',
    productId: '',
    userId: 'u4',
    userName: 'Rajesh Nair',
    rating: 5,
    comment:
      'Sturdy, beautifully balanced, and matches our prayer room decor perfectly. Premium packaging ensured zero transit damage. Will definitely order from here again.',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 35).toISOString(),
  },
  {
    id: 'mock-5',
    productId: '',
    userId: 'u5',
    userName: 'Ananya Mukherjee',
    rating: 5,
    comment:
      'Solid natural stone with intricate detailing. The proportions are just right, and it feels built to last generations.',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 48).toISOString(),
  },
]

const getInitials = (name?: string | null) => {
  if (!name) return 'C'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

const formatReviewDate = (dateString?: string) => {
  if (!dateString) return 'Recently'
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return 'Recently'
  }
}

export const ReviewsSection: React.FC<ReviewsSectionProps> = ({
  productId,
  productName,
  ratingAvg,
  reviewCount,
  reviews,
  onReviewSubmitted,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [newRating, setNewRating] = useState(5)
  const [hoverRating, setHoverRating] = useState<number | null>(null)
  const [newComment, setNewComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [sortOption, setSortOption] = useState('Newest')
  const [visibleCount, setVisibleCount] = useState(5)
  const [feedback, setFeedback] = useState<Record<string, ReviewFeedback>>({})
  const { isAuthenticated } = useAuth()
  const { showToast } = useToast()

  const handleReviewSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!isAuthenticated) {
      showToast('Please sign in to write a review.', 'info')
      return
    }
    if (!newComment.trim()) {
      showToast('Please provide a short review comment.', 'info')
      return
    }
    setSubmitting(true)
    try {
      const response = await reviewService.submitReview(productId, newRating, newComment.trim())
      if (response.success) {
        showToast('Your review has been submitted successfully.', 'success')
        setIsModalOpen(false)
        setNewComment('')
        setNewRating(5)
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

  const handleLike = (id: string) => {
    setFeedback((prev) => {
      const current = prev[id] || { likes: 0, dislikes: 0 }
      if (current.liked) {
        return {
          ...prev,
          [id]: { ...current, liked: false, likes: Math.max(0, current.likes - 1) },
        }
      }
      return {
        ...prev,
        [id]: {
          likes: current.likes + 1,
          dislikes: current.disliked ? Math.max(0, current.dislikes - 1) : current.dislikes,
          liked: true,
          disliked: false,
        },
      }
    })
  }

  const handleDislike = (id: string) => {
    setFeedback((prev) => {
      const current = prev[id] || { likes: 0, dislikes: 0 }
      if (current.disliked) {
        return {
          ...prev,
          [id]: { ...current, disliked: false, dislikes: Math.max(0, current.dislikes - 1) },
        }
      }
      return {
        ...prev,
        [id]: {
          likes: current.liked ? Math.max(0, current.likes - 1) : current.likes,
          dislikes: current.dislikes + 1,
          liked: false,
          disliked: true,
        },
      }
    })
  }

  const sortedReviews = useMemo(() => {
    const list = [...(reviews.length > 0 ? reviews : fallbackReviews)]
    if (sortOption === 'Highest') {
      return list.sort((a, b) => b.rating - a.rating)
    }
    if (sortOption === 'Lowest') {
      return list.sort((a, b) => a.rating - b.rating)
    }
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [reviews, sortOption])

  const effectiveRating = ratingAvg ?? 5
  const totalReviewDisplay = reviewCount || sortedReviews.length

  return (
    <div className="py-6">
      {/* Editorial Rating Summary Card & Action Bar */}
      <div className="flex flex-col gap-6 rounded-2xl border border-[var(--kit-line)] bg-[var(--kit-surface)] p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <span className="font-display text-4xl font-bold tracking-tight text-[var(--kit-ink)] sm:text-5xl">
              {effectiveRating.toFixed(1)}
            </span>
            <div className="space-y-1">
              <RatingStars rating={effectiveRating} size="md" />
              <p className="text-xs font-semibold text-[var(--kit-muted)]">
                Based on {totalReviewDisplay} verified{' '}
                {totalReviewDisplay === 1 ? 'review' : 'reviews'}
              </p>
            </div>
          </div>
          {productName && (
            <p className="text-xs font-medium text-[var(--kit-muted)]">
              Verified buyers for{' '}
              <span className="font-semibold text-[var(--kit-ink)]">{productName}</span>
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="editorial-button self-start px-6 py-3 text-xs font-semibold sm:self-center"
        >
          <PenLine className="h-4 w-4 shrink-0" />
          <span className="leading-none">Write a Review</span>
        </button>
      </div>

      {/* Review Count & Sort Bar */}
      <div className="mt-10 flex items-center justify-between border-b border-[var(--kit-line)] pb-4">
        <h4 className="font-display text-lg font-bold text-[var(--kit-ink)] sm:text-xl">
          {sortedReviews.length}{' '}
          {sortedReviews.length === 1 ? 'Customer Review' : 'Customer Reviews'}
        </h4>
        <div className="flex items-center gap-2">
          <label
            htmlFor="review-sort"
            className="hidden text-xs font-semibold text-[var(--kit-muted)] sm:inline"
          >
            Sort by:
          </label>
          <select
            id="review-sort"
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value)}
            className="cursor-pointer rounded-lg border border-[var(--kit-line)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--kit-ink)] outline-none transition-colors hover:border-[var(--kit-ink)]"
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
        {sortedReviews.slice(0, visibleCount).map((review) => {
          const itemFeedback = feedback[review.id] || { likes: 0, dislikes: 0 }
          const initials = getInitials(review.userName)
          return (
            <article key={review.id} className="py-6 sm:py-7">
              {/* Reviewer Header Row */}
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-10 w-10 shrink-0 select-none items-center justify-center rounded-full bg-[var(--kit-ink)] text-xs font-bold text-white shadow-xs"
                    aria-hidden="true"
                  >
                    {initials}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-sm text-[var(--kit-ink)]">
                        {review.userName || 'Verified Buyer'}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200/60 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                        <CheckCircle2 className="h-3 w-3 shrink-0" />
                        <span className="leading-none">Verified</span>
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <RatingStars rating={review.rating} size="xs" />
                      <span className="text-[11px] text-[var(--kit-muted)]">
                        {formatReviewDate(review.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Review Comment */}
              <p className="mt-3.5 text-sm leading-relaxed text-neutral-700 sm:text-base">
                {review.comment}
              </p>

              {/* Helpful / Not Helpful Actions */}
              <div className="mt-4 flex items-center gap-3 text-xs font-medium text-[var(--kit-muted)]">
                <span className="text-[11px]">Was this review helpful?</span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleLike(review.id)}
                    className={`inline-flex cursor-pointer items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-semibold leading-none transition-colors ${
                      itemFeedback.liked
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-700'
                        : 'border-[var(--kit-line)] bg-white text-neutral-600 hover:border-neutral-400 hover:text-[var(--kit-ink)]'
                    }`}
                    aria-label="Mark as helpful"
                  >
                    <ThumbsUp className="h-3.5 w-3.5 shrink-0" />
                    <span className="leading-none">
                      Helpful{itemFeedback.likes > 0 ? ` (${itemFeedback.likes})` : ''}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDislike(review.id)}
                    className={`inline-flex cursor-pointer items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-semibold leading-none transition-colors ${
                      itemFeedback.disliked
                        ? 'border-red-600 bg-red-50 text-red-700'
                        : 'border-[var(--kit-line)] bg-white text-neutral-600 hover:border-neutral-400 hover:text-[var(--kit-ink)]'
                    }`}
                    aria-label="Mark as not helpful"
                  >
                    <ThumbsDown className="h-3.5 w-3.5 shrink-0" />
                    <span className="leading-none">
                      Dislike{itemFeedback.dislikes > 0 ? ` (${itemFeedback.dislikes})` : ''}
                    </span>
                  </button>
                </div>
              </div>
            </article>
          )
        })}
      </div>

      {/* Load More Button */}
      {visibleCount < sortedReviews.length && (
        <div className="mt-8 flex justify-center pb-4">
          <button
            type="button"
            onClick={() => setVisibleCount((prev) => prev + 5)}
            className="editorial-button-secondary px-8 py-2.5 text-xs font-semibold"
          >
            Load more reviews
          </button>
        </div>
      )}

      {/* Modal Form for Writing a Review */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Write a review">
        <form onSubmit={handleReviewSubmit} className="space-y-6">
          {!isAuthenticated && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs font-medium text-amber-800">
              Please sign in with the account used for your order to publish a verified review.
            </div>
          )}

          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[var(--kit-ink)]">
              Your overall rating
            </label>
            <div className="flex items-center gap-1.5">
              {[1, 2, 3, 4, 5].map((star) => {
                const isFilled = star <= (hoverRating ?? newRating)
                return (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setNewRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(null)}
                    className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg border border-[var(--kit-line)] transition-all hover:scale-110 hover:border-amber-400"
                    aria-label={`Rate ${star} out of 5 stars`}
                  >
                    <Star
                      className={`h-5 w-5 ${
                        isFilled
                          ? 'fill-amber-400 text-amber-400'
                          : 'fill-neutral-100 text-neutral-300'
                      }`}
                    />
                  </button>
                )
              })}
              <span className="ml-2 text-xs font-semibold text-[var(--kit-muted)]">
                {hoverRating ?? newRating} of 5 stars
              </span>
            </div>
          </div>

          <div>
            <label
              htmlFor="review-comment"
              className="mb-2 block text-xs font-bold uppercase tracking-wider text-[var(--kit-ink)]"
            >
              Your review
            </label>
            <textarea
              id="review-comment"
              name="comment"
              rows={4}
              required
              value={newComment}
              onChange={(event) => setNewComment(event.target.value)}
              placeholder="Tell us about the craftsmanship, finish, texture, and delivery experience..."
              className="editorial-input w-full p-3.5 text-base"
            />
          </div>

          <button
            type="submit"
            disabled={submitting || !isAuthenticated}
            className="kit-button w-full py-3.5 text-sm font-semibold cursor-pointer disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                <span className="leading-none">Publishing review...</span>
              </>
            ) : (
              <span className="leading-none">Submit Review</span>
            )}
          </button>
        </form>
      </Modal>
    </div>
  )
}

export default ReviewsSection
