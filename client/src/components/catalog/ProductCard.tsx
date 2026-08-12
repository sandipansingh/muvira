import React, { useState } from 'react'
import { Plus } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useCart } from '../../context/CartContext'
import type { ProductDetail, ProductListItem } from '../../lib/types/product'
import { formatPrice } from '../../lib/utils/format'
import { FavoriteButton } from '../common/FavoriteButton'
import { QuickViewModal } from './QuickViewModal'

interface ProductCardProps {
  product: ProductListItem | ProductDetail
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const { addToCart } = useCart()
  const [isWishlisted, setIsWishlisted] = useState(false)
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false)
  const isDetail = 'images' in product
  const primaryImage = isDetail ? product.images[0]?.url : product.primaryImageUrl
  const categoryName = isDetail ? product.category.name : product.categoryName
  const hasDiscount = Boolean(product.salePrice && product.salePrice > product.price)

  const handleWishlistToggle = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsWishlisted((prev) => !prev)
  }

  const handleAddToCart = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    e.stopPropagation()
    addToCart(product)
  }

  return (
    <>
      <div className="group relative bg-white rounded-[2rem] shadow-none flex flex-col h-full justify-between cursor-pointer border border-neutral-100 overflow-hidden transition-all duration-300">
        <div>
          {/* Flush Image Container with curvy bottom border radius */}
          <div className="relative w-full aspect-[4/3] bg-neutral-100 z-0 rounded-b-[1.5rem] overflow-hidden">
            {primaryImage ? (
              <img
                src={primaryImage}
                alt={product.name}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                loading="lazy"
              />
            ) : (
              <div className="flex h-full items-center justify-center p-4 text-center text-xs text-neutral-400">
                Image unavailable
              </div>
            )}

            {/* Discount Badge */}
            {product.discountPercent > 0 && (
              <div className="absolute top-3.5 left-3.5 z-20 bg-black/60 backdrop-blur-md text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider select-none shadow-xs">
                {product.discountPercent}% OFF
              </div>
            )}

            {/* Top Right Wishlist Button */}
            <div className="absolute top-3.5 right-3.5 z-20">
              <FavoriteButton
                isFavorite={isWishlisted}
                onToggle={handleWishlistToggle}
                variant="solid"
                size="sm"
                aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
              />
            </div>
          </div>

          {/* Text Content Block */}
          <div className="px-4 sm:px-5 pt-3.5 sm:pt-4 pb-1">
            <span className="block text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1">
              {categoryName}
            </span>

            <h3 className="font-bold text-sm sm:text-base text-foreground leading-snug line-clamp-1 group-hover:text-brand transition-colors duration-200">
              {product.name}
            </h3>
          </div>
        </div>

        {/* Pricing & Quick Add Row */}
        <div className="px-4 sm:px-5 pb-4 sm:pb-5 pt-2 flex items-center justify-between mt-auto">
          <div className="flex items-baseline gap-1.5">
            <span className="font-bold text-sm sm:text-base text-foreground">
              {formatPrice(product.price)}
            </span>
            {hasDiscount && (
              <span className="text-xs text-neutral-400 line-through">
                {formatPrice(product.salePrice!)}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={handleAddToCart}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-neutral-900 hover:bg-brand text-white flex items-center justify-center transition-all duration-200 shadow-xs active:scale-95 cursor-pointer"
            aria-label={`Add ${product.name} to cart`}
            title="Add to cart"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Full Card Link Overlay */}
        <Link
          to={`/product/${product.slug}`}
          className="absolute inset-0 z-10 cursor-pointer"
          aria-label={`View ${product.name}`}
        />
      </div>

      <QuickViewModal
        product={product}
        isOpen={isQuickViewOpen}
        onClose={() => setIsQuickViewOpen(false)}
      />
    </>
  )
}

export default ProductCard
