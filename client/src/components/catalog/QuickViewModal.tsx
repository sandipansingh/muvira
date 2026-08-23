import React, { useEffect, useState } from 'react'
import { ArrowRight, Check, ShoppingBag } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { ProductDetail, ProductListItem } from '../../lib/types/product'
import { formatPrice } from '../../lib/utils/format'
import { useCart } from '../../context/CartContext'
import { useToast } from '../../context/ToastContext'
import { RatingStars } from '../common/RatingStars'
import { StockBadge } from '../common/StockBadge'
import { Modal } from '../common/Modal'

interface QuickViewModalProps {
  product: ProductListItem | ProductDetail
  isOpen: boolean
  onClose: () => void
}

export const QuickViewModal: React.FC<QuickViewModalProps> = ({ product, isOpen, onClose }) => {
  const { addToCart } = useCart()
  const { showToast } = useToast()
  const isDetail = 'images' in product
  const images = isDetail ? product.images.map((image) => image.url) : [product.primaryImageUrl]
  const categoryName = isDetail ? product.category.name : product.categoryName
  const [selectedImage, setSelectedImage] = useState(images[0] || '')
  const [quantity, setQuantity] = useState(1)
  const [added, setAdded] = useState(false)

  useEffect(() => {
    if (isOpen) {
      const initialImg = isDetail ? product.images[0]?.url : product.primaryImageUrl
      setSelectedImage(initialImg || '')
      setQuantity(1)
      setAdded(false)
    }
  }, [isOpen, product, isDetail])

  const handleAddToCart = () => {
    addToCart(product, quantity)
    setAdded(true)
    showToast(`Added ${quantity} × ${product.name} to your cart`, 'success')
    setTimeout(() => {
      onClose()
      setAdded(false)
    }, 600)
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="xl">
      <div className="grid gap-8 md:grid-cols-2">
        <div className="space-y-3">
          <div className="media-tile flex items-center justify-center">
            {selectedImage ? (
              <img src={selectedImage} alt={product.name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-neutral-400 font-medium">
                Image unavailable
              </div>
            )}
          </div>
          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto no-scrollbar">
              {images.map((image, index) => (
                <button
                  key={`${image}-${index}`}
                  type="button"
                  onClick={() => setSelectedImage(image)}
                  className={`h-16 w-16 shrink-0 cursor-pointer overflow-hidden rounded-[var(--radius-control)] border transition-colors ${
                    selectedImage === image
                      ? 'border-[var(--color-ink)]'
                      : 'border-[var(--color-line)] opacity-60 hover:opacity-100'
                  }`}
                  aria-label={`View image ${index + 1}`}
                >
                  <img
                    src={image}
                    alt={`${product.name} view ${index + 1}`}
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col justify-between gap-6">
          <div>
            <div className="flex items-start justify-between gap-4">
              <span className="eyebrow">{categoryName}</span>
              <StockBadge
                quantity={'stock' in product ? product.stock : 10}
                isAvailable={'inStock' in product ? product.inStock : true}
              />
            </div>
            <h2 className="heading mt-2 text-2xl">{product.name}</h2>
            <div className="mt-3">
              {product.rating !== null && product.rating !== undefined ? (
                <RatingStars
                  rating={product.rating}
                  count={product.reviewCount}
                  size="md"
                  showText
                />
              ) : (
                <span className="text-xs text-neutral-400">No reviews yet</span>
              )}
            </div>
            <div className="mt-4 flex items-baseline gap-3">
              <span className="font-display text-2xl font-bold text-[var(--color-ink)]">
                {formatPrice(product.price)}
              </span>
              {product.salePrice && product.salePrice > product.price && (
                <span className="product-card__meta line-through">
                  {formatPrice(product.salePrice)}
                </span>
              )}
            </div>
            <p className="body-copy mt-4 line-clamp-3 text-sm">
              {'description' in product
                ? product.description
                : product.shortDescription || 'Description unavailable.'}
            </p>
          </div>

          <div className="space-y-4 border-t border-[var(--color-line)] pt-4">
            <div className="flex items-center gap-4">
              <span className="eyebrow">Quantity</span>
              <div className="flex items-center rounded-[var(--radius-control)] border border-[var(--color-line)] bg-[var(--color-surface)] p-1">
                <button
                  type="button"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-[var(--radius-control)] font-bold text-[var(--color-ink)] transition-colors hover:bg-[var(--color-line)]"
                >
                  −
                </button>
                <span className="min-w-8 text-center text-sm font-bold text-[var(--color-ink)]">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity(quantity + 1)}
                  className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-[var(--radius-control)] font-bold text-[var(--color-ink)] transition-colors hover:bg-[var(--color-line)]"
                >
                  +
                </button>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={added}
                className="button-primary px-5 text-xs"
              >
                {added ? (
                  <>
                    <Check className="h-4 w-4 shrink-0 text-emerald-400" />
                    <span className="leading-none">Added to Cart</span>
                  </>
                ) : (
                  <>
                    <ShoppingBag className="h-4 w-4 shrink-0" />
                    <span className="leading-none">Add to Cart</span>
                  </>
                )}
              </button>
              <Link
                to={`/product/${product.slug}`}
                onClick={onClose}
                className="button-secondary text-xs py-3 font-bold text-center justify-center"
              >
                <span className="leading-none">Full Details</span>
                <ArrowRight className="h-4 w-4 shrink-0" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  )
}

export default QuickViewModal
