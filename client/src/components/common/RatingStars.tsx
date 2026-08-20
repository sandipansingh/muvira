import React from 'react'
import { Star } from 'lucide-react'

interface RatingStarsProps {
  rating: number
  count?: number
  size?: 'xs' | 'sm' | 'md' | 'lg'
  showText?: boolean
  className?: string
}

export const RatingStars: React.FC<RatingStarsProps> = ({
  rating,
  count,
  size = 'sm',
  showText = false,
  className = '',
}) => {
  const iconSize =
    size === 'xs'
      ? 'h-3 w-3'
      : size === 'sm'
        ? 'h-3.5 w-3.5'
        : size === 'lg'
          ? 'h-5 w-5'
          : 'h-4 w-4'
  const roundedRating = Math.round(rating)

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <div
        className="flex items-center gap-0.5 text-[var(--kit-text)]"
        aria-label={`${rating.toFixed(1)} out of 5 stars`}
      >
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`${iconSize} ${
              star <= roundedRating
                ? 'fill-[var(--kit-text)] text-[var(--kit-text)]'
                : 'text-neutral-300 fill-neutral-100'
            }`}
          />
        ))}
      </div>
      {showText && (
        <span className="text-xs font-bold text-[var(--kit-ink)]">{rating.toFixed(1)}</span>
      )}
      {count !== undefined && <span className="text-xs text-[var(--kit-muted)]">({count})</span>}
    </div>
  )
}

export default RatingStars
