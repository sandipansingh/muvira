import { StoreImage } from '../common/StoreImage'
import { QuantityControl } from '../cart/QuantityControl'
import { Link } from 'react-router-dom'
import { X } from 'lucide-react'
import type { CartItem } from '../../lib/types/cart'
import { formatPrice } from '../../lib/utils/format'
import { useCart } from '../../context/CartContext'

export interface FlowItemCardProps {
  item: CartItem
  showQuantityPicker?: boolean
}

export function FlowItemCard({ item, showQuantityPicker = true }: FlowItemCardProps) {
  const { updateQuantity, removeFromCart, loading } = useCart()
  return (
    <article className="commerce-item cart-product-row">
      <Link
        to={`/product/${item.productSlug}`}
        aria-label={`View ${item.productName}`}
        className="commerce-item__image cart-product-image overflow-hidden rounded-image bg-surface"
      >
        <StoreImage
          framing="square"
          fallbackPresentation="icon"
          src={item.productImage || undefined}
          alt={item.productName}
          width={160}
          height={160}
          className="h-full w-full object-cover"
        />
      </Link>
      <div className="cart-product-details min-w-0">
        <Link
          to={`/product/${item.productSlug}`}
          className="inline-flex min-h-11 items-center font-product text-sm font-medium leading-5 text-ink hover:text-primary"
        >
          {item.productName}
        </Link>
        <p className="cart-product-meta mt-1 text-xs text-muted">
          {item.inStock ? `${item.availableStock} available` : 'Currently unavailable'}
        </p>
        <p className="cart-product-meta mt-1 text-xs text-muted">
          {formatPrice(item.unitPrice)} each
        </p>
      </div>
      {showQuantityPicker ? (
        <QuantityControl
          quantity={item.quantity}
          maximum={item.availableStock}
          busy={loading}
          label={item.productName}
          onChange={(delta) => void updateQuantity(item.id, delta).catch(() => undefined)}
        />
      ) : (
        <span className="text-sm text-muted">Qty {item.quantity}</span>
      )}
      <p className="cart-product-total font-product text-sm text-ink">
        {formatPrice(item.lineTotal)}
      </p>
      <button
        type="button"
        onClick={() => void removeFromCart(item.id).catch(() => undefined)}
        disabled={loading}
        aria-label={`Remove ${item.productName}`}
        className="cart-product-remove rounded-control text-muted hover:bg-danger-soft hover:text-danger disabled:opacity-50"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </article>
  )
}
export default FlowItemCard
