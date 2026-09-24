import React, { useEffect, useState } from 'react'
import { Plus, ChevronRight, Sparkles } from 'lucide-react'
import { productService } from '../../lib/services/product.service'
import type { ProductListItem } from '../../lib/types/product'
import { formatPrice } from '../../lib/utils/format'
import { useCart } from '../../context/CartContext'

export const RecommendedUpsell: React.FC = () => {
  const [recommendations, setRecommendations] = useState<ProductListItem[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)
  const { addToCart, items } = useCart()

  useEffect(() => {
    let active = true
    const fetchRecommendations = async () => {
      try {
        const res = await productService.getProducts({ sort: 'featured', limit: 8 })
        if (res.success && active) {
          // Filter out items already in cart
          const inCartIds = new Set(items.map((i) => i.productId))
          const available = res.data.filter((p) => !inCartIds.has(p.id))
          setRecommendations(available.length > 0 ? available : res.data)
        }
      } catch {
        if (active) setRecommendations([])
      } finally {
        if (active) setLoading(false)
      }
    }
    void fetchRecommendations()
    return () => {
      active = false
    }
  }, [items])

  const handleNext = () => {
    if (recommendations.length > 1) {
      setCurrentIndex((prev) => (prev + 1) % recommendations.length)
    }
  }

  const handleAddCurrent = async () => {
    const current = recommendations[currentIndex]
    if (!current || isAdding) return

    setIsAdding(true)
    try {
      await addToCart(current, 1)
      // Advance to next recommendation
      if (recommendations.length > 1) {
        setCurrentIndex((prev) => (prev + 1) % recommendations.length)
      }
    } catch {
      // Cart context presents the server error.
    } finally {
      setIsAdding(false)
    }
  }

  if (loading || recommendations.length === 0) return null

  const product = recommendations[currentIndex]
  if (!product) return null

  return (
    <div className="mt-6 space-y-2.5">
      <h3 className="font-display text-xs sm:text-sm font-bold text-[var(--color-ink)] flex items-center gap-1.5">
        <Sparkles className="h-3.5 w-3.5 text-[var(--color-primary)] shrink-0" />
        Featured product
      </h3>

      <div className="relative flex flex-wrap items-center gap-3.5 rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper)] p-[min(0.875rem,3vw)] shadow-xs transition-all hover:border-[var(--color-field-border)]">
        {/* Product Image */}
        <div className="relative h-16 w-16 sm:h-20 sm:w-20 shrink-0 overflow-hidden rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)]">
          {product.primaryImageUrl ? (
            <img
              src={product.primaryImageUrl}
              alt={product.name}
              width={80}
              height={80}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-[10px] text-[var(--color-muted)]">
              Decor
            </div>
          )}
          {product.isFeatured && (
            <span className="absolute right-1 top-1 rounded bg-white/90 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-[var(--color-ink)]">
              Featured
            </span>
          )}
        </div>

        {/* Info */}
        <div className="min-w-0 flex-[1_1_8rem] space-y-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h4 className="min-w-0 flex-[1_1_8rem] break-words font-display text-xs font-bold text-[var(--color-ink)] xs:line-clamp-1 sm:text-sm">
              {product.name}
            </h4>
            <div className="text-right shrink-0">
              {product.salePrice != null && (
                <span className="block text-[10px] text-[var(--color-muted)] line-through">
                  {formatPrice(product.price)}
                </span>
              )}
              <span className="font-sans text-xs sm:text-sm font-bold text-[var(--color-primary)]">
                {formatPrice(product.price)}
              </span>
            </div>
          </div>

          <div className="pt-1">
            <button
              type="button"
              onClick={handleAddCurrent}
              disabled={isAdding}
              className="inline-flex cursor-pointer items-center gap-1 text-xs font-bold text-[var(--color-primary)] transition-colors hover:text-[var(--color-primary-hover)] hover:underline disabled:opacity-50"
            >
              <Plus className="h-3 w-3 stroke-[2.5]" />
              <span>{isAdding ? 'Adding...' : 'Add to your order'}</span>
            </button>
          </div>
        </div>

        {/* Carousel Arrow (>) */}
        {recommendations.length > 1 && (
          <button
            type="button"
            onClick={handleNext}
            aria-label="Next recommendation"
            className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full bg-[var(--color-surface)] text-[var(--color-muted)] transition-all hover:bg-[var(--color-ink)] hover:text-white"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  )
}

export default RecommendedUpsell
