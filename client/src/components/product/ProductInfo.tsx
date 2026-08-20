import React, { useEffect, useState } from 'react'
import { Heart, ShoppingBag } from 'lucide-react'
import type { ProductDetail } from '../../lib/types/product'
import { formatPrice } from '../../lib/utils/format'
import { useCart } from '../../context/CartContext'
import { RatingStars } from '../common/RatingStars'

interface ProductInfoProps {
  product: ProductDetail
  onReviewClick?: () => void
}

interface ColorOption {
  name: string
  image?: string
  colorHex?: string
}

export const ProductInfo: React.FC<ProductInfoProps> = ({ product, onReviewClick }) => {
  const { addToCart } = useCart()
  const [quantity, setQuantity] = useState(1)
  const [isWishlisted, setIsWishlisted] = useState(false)
  const [selectedColor, setSelectedColor] = useState('Black')

  /* Countdown timer state (simulated offer countdown) */
  const [timeLeft, setTimeLeft] = useState({
    days: 2,
    hours: 12,
    minutes: 45,
    seconds: 5,
  })

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 }
        if (prev.minutes > 0) return { ...prev, minutes: 59, seconds: 59 }
        if (prev.hours > 0) return { ...prev, hours: prev.hours - 1, minutes: 59, seconds: 59 }
        if (prev.days > 0) return { ...prev, days: prev.days - 1, hours: 23, minutes: 59, seconds: 59 }
        return prev
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const hasDiscount = Boolean(product.salePrice && product.salePrice > product.price)

  /* Default color variants for selection matching design reference */
  const colorOptions: ColorOption[] = [
    { name: 'Black', image: product.images[0]?.url },
    { name: 'Brown', image: product.images[1]?.url || product.images[0]?.url },
    { name: 'Red', image: product.images[2]?.url || product.images[0]?.url },
    { name: 'White', image: product.images[3]?.url || product.images[0]?.url },
  ]

  const formatTwoDigits = (num: number) => String(num).padStart(2, '0')

  return (
    <div className="space-y-6">
      {/* Rating & Review Link */}
      <div className="flex items-center gap-2">
        <RatingStars rating={product.rating ?? 5} size="sm" />
        <button
          type="button"
          onClick={onReviewClick}
          className="text-xs font-semibold text-[var(--kit-ink)] transition-colors hover:underline"
        >
          {product.reviewCount ?? 11} Reviews
        </button>
      </div>

      {/* Product Title */}
      <h1 className="font-display text-3xl font-bold text-[var(--kit-ink)] sm:text-4xl">
        {product.name}
      </h1>

      {/* Product Description */}
      <p className="text-sm leading-relaxed text-[var(--kit-muted)] sm:text-base">
        {product.shortDescription || product.description}
      </p>

      {/* Price Block */}
      <div className="flex items-baseline gap-3">
        <span className="font-display text-2xl font-bold text-[var(--kit-ink)] sm:text-3xl">
          {formatPrice(product.price)}
        </span>
        {hasDiscount && (
          <span className="text-base text-[var(--kit-muted)] line-through">
            {formatPrice(product.salePrice!)}
          </span>
        )}
      </div>

      {/* Offer Countdown Timer */}
      <div className="border-t border-[var(--kit-line)] pt-4">
        <p className="mb-3 text-xs font-medium text-[var(--kit-muted)]">Offer expires in:</p>
        <div className="grid grid-cols-4 gap-3 max-w-xs">
          <div className="flex flex-col items-center rounded-lg bg-[var(--kit-surface)] py-2">
            <span className="font-display text-xl font-bold text-[var(--kit-ink)]">
              {formatTwoDigits(timeLeft.days)}
            </span>
            <span className="text-[10px] text-[var(--kit-muted)]">Days</span>
          </div>
          <div className="flex flex-col items-center rounded-lg bg-[var(--kit-surface)] py-2">
            <span className="font-display text-xl font-bold text-[var(--kit-ink)]">
              {formatTwoDigits(timeLeft.hours)}
            </span>
            <span className="text-[10px] text-[var(--kit-muted)]">Hours</span>
          </div>
          <div className="flex flex-col items-center rounded-lg bg-[var(--kit-surface)] py-2">
            <span className="font-display text-xl font-bold text-[var(--kit-ink)]">
              {formatTwoDigits(timeLeft.minutes)}
            </span>
            <span className="text-[10px] text-[var(--kit-muted)]">Mins</span>
          </div>
          <div className="flex flex-col items-center rounded-lg bg-[var(--kit-surface)] py-2">
            <span className="font-display text-xl font-bold text-[var(--kit-ink)]">
              {formatTwoDigits(timeLeft.seconds)}
            </span>
            <span className="text-[10px] text-[var(--kit-muted)]">Secs</span>
          </div>
        </div>
      </div>

      {/* Color Variant Selector */}
      <div className="space-y-3 border-t border-[var(--kit-line)] pt-4">
        <div className="flex items-center gap-1 text-sm font-semibold text-[var(--kit-muted)]">
          <span>Choose Color</span>
          <span>&gt;</span>
          <span className="ml-1 font-bold text-[var(--kit-ink)]">{selectedColor}</span>
        </div>
        <div className="flex gap-3">
          {colorOptions.map((option) => (
            <button
              key={option.name}
              type="button"
              onClick={() => setSelectedColor(option.name)}
              className={`h-16 w-16 cursor-pointer overflow-hidden rounded-xl transition-all ${
                selectedColor === option.name
                  ? 'border-2 border-[var(--kit-ink)] ring-2 ring-[var(--kit-ink)]/20'
                  : 'border border-[var(--kit-line)] opacity-70 hover:opacity-100'
              }`}
              aria-label={`Select color ${option.name}`}
            >
              {option.image ? (
                <img
                  src={option.image}
                  alt={option.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-xs font-semibold">
                  {option.name}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Quantity Selector & Wishlist / Cart Actions */}
      <div className="space-y-4 border-t border-[var(--kit-line)] pt-4">
        <div className="flex items-center gap-3">
          {/* Quantity Counter */}
          <div className="flex h-12 items-center rounded-lg bg-[var(--kit-surface)] px-3">
            <button
              type="button"
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="flex h-8 w-8 items-center justify-center text-lg font-bold text-[var(--kit-ink)] transition-colors hover:text-[var(--kit-muted)]"
              aria-label="Decrease quantity"
            >
              −
            </button>
            <span className="w-8 text-center text-sm font-bold text-[var(--kit-ink)]">
              {quantity}
            </span>
            <button
              type="button"
              onClick={() => setQuantity(quantity + 1)}
              className="flex h-8 w-8 items-center justify-center text-lg font-bold text-[var(--kit-ink)] transition-colors hover:text-[var(--kit-muted)]"
              aria-label="Increase quantity"
            >
              +
            </button>
          </div>

          {/* Wishlist Button */}
          <button
            type="button"
            onClick={() => setIsWishlisted((prev) => !prev)}
            className={`flex h-12 flex-1 items-center justify-center gap-2 rounded-lg border border-[var(--kit-ink)] bg-transparent px-4 font-semibold text-sm transition-colors ${
              isWishlisted
                ? 'border-red-500 text-red-500'
                : 'text-[var(--kit-ink)] hover:bg-[var(--kit-surface)]'
            }`}
            aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
          >
            <Heart className={`h-4 w-4 ${isWishlisted ? 'fill-current' : ''}`} />
            <span>Wishlist</span>
          </button>
        </div>

        {/* Add to Cart Button */}
        <button
          type="button"
          onClick={() => addToCart(product, quantity)}
          className="flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#141718] text-base font-semibold text-white transition-colors hover:bg-black"
        >
          <ShoppingBag className="h-5 w-5" />
          <span>Add to Cart</span>
        </button>
      </div>

      {/* Metadata (SKU & Category) */}
      <div className="space-y-1.5 border-t border-[var(--kit-line)] pt-4 text-xs text-[var(--kit-muted)]">
        <div className="flex gap-4">
          <span className="w-20 font-semibold uppercase text-[var(--kit-muted)]">SKU</span>
          <span className="text-[var(--kit-ink)]">{product.sku || '1117'}</span>
        </div>
        <div className="flex gap-4">
          <span className="w-20 font-semibold uppercase text-[var(--kit-muted)]">CATEGORY</span>
          <span className="text-[var(--kit-ink)]">{product.category.name}</span>
        </div>
      </div>
    </div>
  )
}

export default ProductInfo
