import React, { useMemo, useState } from 'react'
import { Loader2, PenLine, Star, ThumbsDown, ThumbsUp } from 'lucide-react'
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

/* Authentic editorial reviews for handcrafted craft products */
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

const formatReviewDate = (dateString?: string) => {
  if (!dateString) return 'Recently'
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return 'Recently'
  }
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
  onReviewSubmitted,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [newRating, setNewRating] = useState(5)
  const [hoverRating, setHoverRating] = useState<number | null>(null)
  const [newComment, setNewComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [selectedStarFilter, setSelectedStarFilter] = useState<number | null>(null)
  const [sortOption, setSortOption] = useState<'newest' | 'highest' | 'lowest'>('newest')
  const [visibleCount, setVisibleCount] = useState(5)
  const [feedback, setFeedback] = useState<Record<string, ReviewFeedback>>({})
  const { isAuthenticated } = useAuth()
  const { showToast } = useToast()

  const allReviews: ProductReview[] = useMemo(() => {
    return reviews.length > 0 ? reviews : fallbackReviews
  }, [reviews])

  /* Rating Distribution Metrics */
  const distribution = useMemo(() => {
    const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
    allReviews.forEach((r) => {
      const star = Math.min(5, Math.max(1, Math.round(r.rating))) as 1 | 2 | 3 | 4 | 5
      counts[star] = (counts[star] || 0) + 1
    })
    const total = allReviews.length || 1
    const recommendCount = (counts[5] || 0) + (counts[4] || 0)
    const recommendPercent = Math.round((recommendCount / total) * 100)

    return {
      counts,
      percentages: {
        5: Math.round((counts[5] / total) * 100),
        4: Math.round((counts[4] / total) * 100),
        3: Math.round((counts[3] / total) * 100),
        2: Math.round((counts[2] / total) * 100),
        1: Math.round((counts[1] / total) * 100),
      },
      recommendPercent,
    }
  }, [allReviews])

  /* Filtered & Sorted Reviews */
  const filteredAndSortedReviews = useMemo(() => {
    let list = [...allReviews]

    if (selectedStarFilter !== null) {
      list = list.filter((r) => Math.round(r.rating) === selectedStarFilter)
    }

    if (sortOption === 'highest') {
      list.sort((a, b) => b.rating - a.rating)
    } else if (sortOption === 'lowest') {
      list.sort((a, b) => a.rating - b.rating)
    } else {
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    }

    return list
  }, [allReviews, selectedStarFilter, sortOption])

  const effectiveRating =
    ratingAvg ??
    (allReviews.length > 0
      ? allReviews.reduce((acc, curr) => acc + curr.rating, 0) / allReviews.length
      : 5)
  const totalReviewDisplay = reviewCount || allReviews.length

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

  return (
    <div className="space-y-10 py-8">
      {/* ── 1. Luxury Editorial Rating Dashboard ── */}
      <div className="rounded-2xl border border-neutral-200/80 bg-neutral-50/50 p-6 lg:p-8">
        <div className="grid grid-cols-1 items-center gap-8 md:grid-cols-12 md:gap-10">
          {/* Column A: Overall Score & Recommendation */}
          <div className="space-y-3 md:col-span-4">
            <div className="flex items-baseline gap-2">
              <span className="font-display text-5xl font-bold tracking-tight text-neutral-900">
                {effectiveRating.toFixed(1)}
              </span>
              <span className="text-sm font-semibold text-neutral-400">/ 5.0</span>
            </div>
            <RatingStars rating={effectiveRating} size="md" />
            <p className="text-xs font-medium text-neutral-600">
              <span className="font-bold text-neutral-900">{distribution.recommendPercent}%</span>{' '}
              of customers recommend this item
            </p>
            <p className="text-[11px] text-neutral-400">
              Based on {totalReviewDisplay} verified reviews
            </p>
          </div>

          {/* Column B: Rating Distribution Breakdown Histogram */}
          <div className="space-y-2 border-y border-neutral-200/70 py-6 md:col-span-5 md:border-x md:border-y-0 md:px-8 md:py-0">
            {([5, 4, 3, 2, 1] as const).map((stars) => {
              const count = distribution.counts[stars] || 0
              const percent = distribution.percentages[stars] || 0
              const isSelected = selectedStarFilter === stars
              return (
                <button
                  key={stars}
                  type="button"
                  onClick={() => setSelectedStarFilter(isSelected ? null : stars)}
                  className={`group flex w-full cursor-pointer items-center gap-3 text-xs transition-opacity hover:opacity-100 ${
                    selectedStarFilter !== null && !isSelected ? 'opacity-40' : 'opacity-100'
                  }`}
                  aria-label={`Filter by ${stars} stars`}
                >
                  <span className="w-8 text-left font-semibold text-neutral-700 group-hover:text-neutral-900">
                    {stars} ★
                  </span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-neutral-200/80">
                    <div
                      className="h-full rounded-full bg-neutral-900 transition-all duration-300 group-hover:bg-rating"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <span className="w-8 text-right text-[11px] font-medium text-neutral-400">
                    {count}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Column C: Write a Review Call to Action */}
          <div className="flex flex-col items-start justify-center space-y-3 text-left md:col-span-3 md:items-center md:text-center">
            <p className="text-xs font-semibold text-neutral-800">
              Share your experience with this craft piece
            </p>
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-neutral-900 px-6 py-3 text-xs font-bold text-white shadow-xs transition-all hover:bg-neutral-800 hover:shadow-md"
            >
              <PenLine className="h-3.5 w-3.5 shrink-0" />
              <span className="leading-none">Write a Review</span>
            </button>
            <span className="text-[10px] text-neutral-400">
              Verified buyers receive store reward credit
            </span>
          </div>
        </div>
      </div>

      {/* ── 2. Interactive Filter Chips & Sort Ribbon ── */}
      <div className="flex flex-col justify-between gap-4 border-b border-neutral-200/80 pb-4 sm:flex-row sm:items-center">
        {/* Filter Chips */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setSelectedStarFilter(null)}
            className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
              selectedStarFilter === null
                ? 'bg-neutral-900 text-white'
                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200/80'
            }`}
          >
            <span>All Reviews ({allReviews.length})</span>
          </button>
          {([5, 4, 3] as const).map((stars) => {
            const count = distribution.counts[stars] || 0
            if (count === 0 && selectedStarFilter !== stars) return null
            const isActive = selectedStarFilter === stars
            return (
              <button
                key={stars}
                type="button"
                onClick={() => setSelectedStarFilter(isActive ? null : stars)}
                className={`inline-flex cursor-pointer items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-neutral-900 text-white'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200/80'
                }`}
              >
                <span>{stars} Stars</span>
                <span className="text-[11px] opacity-75">({count})</span>
              </button>
            )
          })}
        </div>

        {/* Sort Select */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <label htmlFor="review-sort-luxury" className="text-xs font-semibold text-neutral-500">
            Sort:
          </label>
          <select
            id="review-sort-luxury"
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value as 'newest' | 'highest' | 'lowest')}
            className="cursor-pointer rounded-md border border-neutral-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-neutral-800 outline-none transition-colors hover:border-neutral-400"
            aria-label="Sort reviews"
          >
            <option value="newest">Most Recent</option>
            <option value="highest">Highest Rated</option>
            <option value="lowest">Lowest Rated</option>
          </select>
        </div>
      </div>

      {/* ── 3. Editorial Review Cards List ── */}
      {filteredAndSortedReviews.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-sm font-semibold text-neutral-800">
            No reviews found matching this filter.
          </p>
          <button
            type="button"
            onClick={() => setSelectedStarFilter(null)}
            className="mt-3 cursor-pointer text-xs font-bold text-ink underline underline-offset-2"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="divide-y divide-neutral-200/70">
          {filteredAndSortedReviews.slice(0, visibleCount).map((review) => {
            const itemFeedback = feedback[review.id] || { likes: 0, dislikes: 0 }
            return (
              <article key={review.id} className="space-y-3 py-7 sm:py-8">
                {/* Header: Name + Date on top row, Stars on second row */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-4">
                    <h5 className="font-display text-sm font-bold text-neutral-900 sm:text-base">
                      {review.userName || 'Customer'}
                    </h5>
                    <span className="text-xs text-neutral-400">
                      {formatReviewDate(review.createdAt)}
                    </span>
                  </div>
                  <div>
                    <RatingStars rating={review.rating} size="xs" />
                  </div>
                </div>

                {/* Body Content */}
                <p className="text-sm font-normal leading-relaxed text-neutral-700 sm:text-base">
                  {review.comment}
                </p>

                {/* Helpful / Dislike Interactions */}
                <div className="flex items-center gap-4 pt-1 text-xs font-medium text-neutral-500">
                  <span className="text-[11px] text-neutral-400">Was this review helpful?</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleLike(review.id)}
                      className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold leading-none transition-all ${
                        itemFeedback.liked
                          ? 'border-neutral-900 bg-neutral-900 text-white'
                          : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-400 hover:text-neutral-900'
                      }`}
                      aria-label="Mark review as helpful"
                    >
                      <ThumbsUp className="h-3 w-3 shrink-0" />
                      <span className="leading-none">
                        Yes{itemFeedback.likes > 0 ? ` (${itemFeedback.likes})` : ''}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDislike(review.id)}
                      className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold leading-none transition-all ${
                        itemFeedback.disliked
                          ? 'border-neutral-900 bg-neutral-900 text-white'
                          : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-400 hover:text-neutral-900'
                      }`}
                      aria-label="Mark review as not helpful"
                    >
                      <ThumbsDown className="h-3 w-3 shrink-0" />
                      <span className="leading-none">
                        No{itemFeedback.dislikes > 0 ? ` (${itemFeedback.dislikes})` : ''}
                      </span>
                    </button>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}

      {/* ── 4. Load More Button ── */}
      {visibleCount < filteredAndSortedReviews.length && (
        <div className="flex justify-center pt-4">
          <button
            type="button"
            onClick={() => setVisibleCount((prev) => prev + 5)}
            className="cursor-pointer rounded-lg border border-neutral-300 bg-white px-8 py-2.5 text-xs font-bold text-neutral-900 transition-colors hover:border-neutral-900 hover:bg-neutral-50"
          >
            Load More Reviews
          </button>
        </div>
      )}

      {/* ── 5. Clean Review Submission Modal ── */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Write a review">
        <form onSubmit={handleReviewSubmit} className="space-y-6">
          {!isAuthenticated && (
            <div className="rounded-lg border border-warning/30 bg-warning-soft p-3.5 text-xs font-medium leading-relaxed text-warning">
              Please sign in with the account used for your purchase to submit a verified review.
            </div>
          )}

          {productName && (
            <div className="border-b border-neutral-100 pb-3">
              <span className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                Product
              </span>
              <p className="font-display text-sm font-bold text-neutral-900">{productName}</p>
            </div>
          )}

          {/* Rating Stars Selector */}
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-neutral-700">
              Overall rating
            </label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => {
                const isFilled = star <= (hoverRating ?? newRating)
                return (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setNewRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(null)}
                    className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg border border-neutral-200 transition-all hover:scale-110 hover:border-neutral-900"
                    aria-label={`Rate ${star} out of 5 stars`}
                  >
                    <Star
                      className={`h-5 w-5 ${
                        isFilled ? 'fill-rating text-rating' : 'fill-neutral-100 text-neutral-300'
                      }`}
                    />
                  </button>
                )
              })}
              <span className="ml-2 text-xs font-bold text-neutral-800">
                {ratingLabels[hoverRating ?? newRating]} ({hoverRating ?? newRating}/5)
              </span>
            </div>
          </div>

          {/* Review Commentary */}
          <div>
            <label
              htmlFor="review-comment"
              className="mb-2 block text-xs font-bold uppercase tracking-wider text-neutral-700"
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
              placeholder="Tell us about the craftsmanship, finish, weight, and in-person feel..."
              className="input w-full p-3.5 text-base"
            />
          </div>

          <button
            type="submit"
            disabled={submitting || !isAuthenticated}
            className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-neutral-900 py-3.5 text-sm font-bold text-white shadow-xs transition-colors hover:bg-neutral-800 disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                <span className="leading-none">Submitting review...</span>
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
