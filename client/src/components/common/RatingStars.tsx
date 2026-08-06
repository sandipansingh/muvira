import React from 'react'
import { Star } from 'lucide-react'

interface RatingStarsProps {
  rating: number
  count?: number
  size?: 'sm' | 'md' | 'lg'
}

export const RatingStars: React.FC<RatingStarsProps> = ({ rating, count, size = 'sm' }) => {
  const iconSize = size === 'sm' ? 'h-3 w-3' : size === 'lg' ? 'h-5 w-5' : 'h-4 w-4'
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex text-cognac" aria-label={`${rating.toFixed(1)} out of 5 stars`}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`${iconSize} ${star <= Math.round(rating) ? 'fill-current' : 'text-line'}`}
          />
        ))}
      </div>
      <span className="text-xs font-semibold text-ink">{rating.toFixed(1)}</span>
      {count !== undefined && <span className="text-xs text-muted-ink">({count})</span>}
    </div>
  )
}
