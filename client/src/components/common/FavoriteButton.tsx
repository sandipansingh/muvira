import React from 'react'
import { Heart } from 'lucide-react'

interface FavoriteButtonProps {
  isFavorite?: boolean
  onToggle?: (e: React.MouseEvent<HTMLButtonElement>) => void
  variant?: 'solid' | 'glass'
  size?: 'sm' | 'md'
  className?: string
  'aria-label'?: string
}

export const FavoriteButton: React.FC<FavoriteButtonProps> = ({
  isFavorite = false,
  onToggle,
  variant = 'solid',
  size = 'sm',
  className = '',
  'aria-label': ariaLabel = 'Add to favorites',
}) => {
  const sizeClasses = size === 'sm' ? 'w-8 h-8' : 'w-10 h-10'
  const iconSizes = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5'

  const variantClasses =
    variant === 'glass'
      ? 'bg-white/20 backdrop-blur-md border border-white/25 text-white hover:bg-white/30'
      : 'bg-white text-neutral-800 border border-neutral-100 shadow-sm hover:bg-neutral-50 hover:text-brand'

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={ariaLabel}
      aria-pressed={isFavorite}
      className={`rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer ${sizeClasses} ${variantClasses} ${className}`}
    >
      <Heart
        className={`${iconSizes} transition-colors ${
          isFavorite ? 'fill-red-500 text-red-500' : ''
        }`}
      />
    </button>
  )
}

export default FavoriteButton
