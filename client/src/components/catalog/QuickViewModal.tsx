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
      <div className="grid gap-6 md:grid-cols-2 md:items-stretch">
        <div className="flex flex-col justify-between space-y-3 md:h-full">
          <div className="relative min-h-[280px] flex-1 overflow-hidden rounded-[var(--radius-card)] bg-[var(--color-surface)] sm:min-h-[340px] md:min-h-[420px]">
            {selectedImage ? (
              <img
                src={selectedImage}
                alt={product.name}
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-xs font-medium text-muted">
                Image unavailable
              </div>
            )}
          </div>
          {images.length > 1 && (
            <div className="no-scrollbar flex shrink-0 gap-2 overflow-x-auto">
              {images.map((image, index) => (
                <button
                  key={`${image}-${index}`}
                  type="button"
                  onClick={() => setSelectedImage(image)}
                  className={`h-14 w-14 shrink-0 cursor-pointer overflow-hidden rounded-[var(--radius-control)] border transition-colors ${
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

        <div className="flex flex-col justify-between md:h-full">
          <div>
            <div className="flex items-center justify-between gap-4 pr-10">
              <span className="eyebrow">{categoryName}</span>
              <StockBadge
                quantity={'stock' in product ? product.stock : 10}
                isAvailable={'inStock' in product ? product.inStock : true}
              />
            </div>
            <h2 className="heading mt-1.5 text-lg font-bold pr-10 sm:text-xl line-clamp-2">
              {product.name}
            </h2>
            <div className="mt-2 flex items-center gap-2">
              <RatingStars
                rating={product.rating ?? 5}
                count={product.reviewCount ?? 0}
                size="sm"
                showText
              />
            </div>
            <div className="mt-3 flex items-baseline gap-2.5">
              <span className="font-display text-xl font-bold text-[var(--color-ink)] sm:text-2xl">
                {formatPrice(product.price)}
              </span>
              {product.salePrice && product.salePrice > product.price && (
                <span className="product-card__meta line-through">
                  {formatPrice(product.salePrice)}
                </span>
              )}
            </div>
            <p className="body-copy mt-2.5 line-clamp-2 text-xs sm:text-sm">
              {'description' in product
                ? product.description
                : product.shortDescription || 'Description unavailable.'}
            </p>
          </div>

          <div className="mt-4 space-y-3 border-t border-[var(--color-line)] pt-3.5">
            <div className="flex items-center gap-3">
              <span className="eyebrow">Quantity</span>
              <div className="flex items-center rounded-[var(--radius-control)] border border-[var(--color-line)] bg-[var(--color-surface)] p-0.5">
                <button
                  type="button"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-[var(--radius-control)] text-xs font-bold text-[var(--color-ink)] transition-colors hover:bg-[var(--color-line)]"
                >
                  −
                </button>
                <span className="min-w-7 text-center text-xs font-bold text-[var(--color-ink)]">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity(quantity + 1)}
                  className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-[var(--radius-control)] text-xs font-bold text-[var(--color-ink)] transition-colors hover:bg-[var(--color-line)]"
                >
                  +
                </button>
              </div>
            </div>
            <div className="grid gap-2.5 sm:grid-cols-2">
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={added}
                className="button-primary min-h-10 px-4 text-xs"
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
                className="button-secondary min-h-10 text-xs px-4 font-bold text-center justify-center"
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
