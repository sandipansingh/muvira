import React, { useState } from 'react'
import { ArrowRight, ShoppingBag } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { ProductDetail, ProductListItem } from '../../lib/types/product'
import { formatPrice } from '../../lib/utils/format'
import { useCart } from '../../context/CartContext'
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
  const isDetail = 'images' in product
  const images = isDetail ? product.images.map((image) => image.url) : [product.primaryImageUrl]
  const categoryName = isDetail ? product.category.name : product.categoryName
  const [selectedImage, setSelectedImage] = useState(images[0] || '')
  const [quantity, setQuantity] = useState(1)

  const handleAddToCart = () => {
    addToCart(product, quantity)
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="xl">
      <div className="grid gap-8 md:grid-cols-2">
        <div className="space-y-3">
          <div className="aspect-square overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-50/90 flex items-center justify-center p-4">
            {selectedImage ? (
              <img
                src={selectedImage}
                alt={product.name}
                className="h-full w-full object-cover rounded-xl"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-slate-400 font-medium">
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
                  className={`h-16 w-16 shrink-0 overflow-hidden rounded-xl border transition-all ${
                    selectedImage === image
                      ? 'border-slate-900 ring-2 ring-slate-900/10'
                      : 'border-slate-200 opacity-60 hover:opacity-100'
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
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                {categoryName}
              </span>
              <StockBadge
                quantity={'stock' in product ? product.stock : 10}
                isAvailable={'inStock' in product ? product.inStock : true}
              />
            </div>
            <h2 className="font-serif text-2xl font-extrabold text-slate-900 mt-2">
              {product.name}
            </h2>
            <div className="mt-3">
              {product.rating !== null && product.rating !== undefined ? (
                <RatingStars rating={product.rating} count={product.reviewCount} size="md" />
              ) : (
                <span className="text-xs text-slate-400">No reviews yet</span>
              )}
            </div>
            <div className="mt-4 flex items-baseline gap-3 rounded-xl border border-slate-200/80 bg-slate-50/80 p-4">
              <span className="text-2xl font-extrabold text-slate-900">
                {formatPrice(product.price)}
              </span>
              {product.salePrice && product.salePrice > product.price && (
                <span className="text-sm text-slate-400 line-through">
                  {formatPrice(product.salePrice)}
                </span>
              )}
            </div>
            <p className="mt-4 text-sm leading-relaxed text-slate-600 line-clamp-3">
              {'description' in product
                ? product.description
                : product.shortDescription || 'Description unavailable.'}
            </p>
          </div>

          <div className="border-t border-slate-200/80 pt-4 space-y-4">
            <div className="flex items-center gap-4">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Quantity
              </span>
              <div className="flex items-center rounded-full border border-slate-200 bg-slate-100/80 p-1">
                <button
                  type="button"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="flex h-7 w-7 items-center justify-center rounded-full text-slate-700 hover:bg-white transition-all font-bold"
                >
                  −
                </button>
                <span className="min-w-8 text-center text-sm font-bold text-slate-900">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity(quantity + 1)}
                  className="flex h-7 w-7 items-center justify-center rounded-full text-slate-700 hover:bg-white transition-all font-bold"
                >
                  +
                </button>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={handleAddToCart}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#7e3d1c] px-5 py-3 text-xs font-bold text-white shadow-md shadow-[#7e3d1c]/20 transition-all hover:bg-[#693116] active:scale-95"
              >
                <ShoppingBag className="h-4 w-4" /> Add to cart
              </button>
              <Link
                to={`/product/${product.slug}`}
                onClick={onClose}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-xs font-bold text-slate-800 shadow-xs transition-all hover:bg-slate-50"
              >
                Full details <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  )
}
