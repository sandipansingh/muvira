import React, { useState } from 'react'
import { Star, CheckCircle } from 'lucide-react'
import type { Review } from '../../lib/types/review'
import { RatingStars } from '../common/RatingStars'
import { Modal } from '../common/Modal'
import { useToast } from '../../context/ToastContext'

interface ReviewsSectionProps {
  productId: string
  ratingAvg: number
  reviewCount: number
  reviews: Review[]
}

export const ReviewsSection: React.FC<ReviewsSectionProps> = ({
  ratingAvg,
  reviewCount,
  reviews,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [newRating, setNewRating] = useState(5)
  const [newComment, setNewComment] = useState('')
  const [newName, setNewName] = useState('')
  const { showToast } = useToast()

  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    showToast('Thank you! Your review has been submitted for verification.', 'success')
    setIsModalOpen(false)
    setNewComment('')
    setNewName('')
  }

  return (
    <div className="mt-16 pt-12 border-t border-zinc-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
        <div>
          <h3 className="font-serif text-2xl font-bold text-zinc-900">Customer Reviews</h3>
          <p className="text-xs text-zinc-500 mt-1">Real feedback from verified homeowners</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-6 py-2.5 bg-zinc-900 hover:bg-[#C88D35] text-white text-xs font-semibold rounded-full transition-colors self-start sm:self-auto shadow-xs"
        >
          Write a Review
        </button>
      </div>

      {/* Breakdown Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 bg-[#F6F4EF] p-6 sm:p-8 rounded-3xl border border-zinc-200/80 mb-10">
        {/* Left Rating Overview */}
        <div className="flex flex-col items-center justify-center text-center border-b md:border-b-0 md:border-r border-zinc-200/80 pb-6 md:pb-0 md:pr-6">
          <span className="font-serif text-5xl font-bold text-zinc-900">
            {ratingAvg.toFixed(1)}
          </span>
          <div className="my-2">
            <RatingStars rating={ratingAvg} size="lg" />
          </div>
          <span className="text-xs text-zinc-500 font-medium">Based on {reviewCount} reviews</span>
        </div>

        {/* Middle Star Bar breakdown */}
        <div className="md:col-span-2 space-y-2 flex flex-col justify-center">
          {[
            { stars: 5, pct: '88%' },
            { stars: 4, pct: '9%' },
            { stars: 3, pct: '2%' },
            { stars: 2, pct: '1%' },
            { stars: 1, pct: '0%' },
          ].map((bar) => (
            <div key={bar.stars} className="flex items-center gap-3 text-xs">
              <span className="w-12 text-zinc-600 font-semibold">{bar.stars} stars</span>
              <div className="flex-1 h-2 bg-zinc-200 rounded-full overflow-hidden">
                <div className="h-full bg-[#C88D35]" style={{ width: bar.pct }} />
              </div>
              <span className="w-8 text-right text-zinc-400 font-mono">{bar.pct}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Reviews List */}
      <div className="space-y-6">
        {reviews.map((rev) => (
          <div
            key={rev.id}
            className="p-6 bg-white rounded-2xl border border-zinc-200/80 shadow-2xs space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img
                  src={
                    rev.userAvatar ||
                    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&h=80&fit=crop'
                  }
                  alt={rev.userName}
                  className="w-9 h-9 rounded-full object-cover border border-zinc-200"
                />
                <div>
                  <h5 className="font-semibold text-sm text-zinc-900">{rev.userName}</h5>
                  {rev.verifiedPurchase && (
                    <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-medium">
                      <CheckCircle className="w-3 h-3 text-emerald-600" /> Verified Buyer
                    </span>
                  )}
                </div>
              </div>
              <span className="text-xs text-zinc-400">
                {new Date(rev.createdAt).toLocaleDateString('en-IN', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
            </div>

            <RatingStars rating={rev.rating} size="sm" />

            <p className="text-xs sm:text-sm text-zinc-700 leading-relaxed font-light">
              "{rev.comment}"
            </p>
          </div>
        ))}
      </div>

      {/* Write Review Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Write a Review">
        <form onSubmit={handleReviewSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">Your Rating</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setNewRating(s)}
                  className="p-1 text-[#C88D35]"
                >
                  <Star
                    className={`w-6 h-6 ${s <= newRating ? 'fill-[#C88D35]' : 'text-zinc-300'}`}
                  />
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">Your Name</label>
            <input
              type="text"
              required
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Priya N."
              className="w-full bg-[#F6F4EF] border border-zinc-300 rounded-xl px-4 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-[#C88D35]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">Review</label>
            <textarea
              required
              rows={4}
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Tell us about the craftsmanship, comfort, and delivery..."
              className="w-full bg-[#F6F4EF] border border-zinc-300 rounded-xl px-4 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-[#C88D35]"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-zinc-900 text-white font-semibold text-xs uppercase tracking-wider rounded-xl hover:bg-[#C88D35] transition-colors"
          >
            Submit Review
          </button>
        </form>
      </Modal>
    </div>
  )
}
