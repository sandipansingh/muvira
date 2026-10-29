import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Trash2 } from 'lucide-react'
import { StoreImage } from '../common/StoreImage'
import { QuantityControl } from './QuantityControl'
import type { CartItem } from '../../lib/types/cart'
import { formatPrice } from '../../lib/utils/format'
import { useCart } from '../../context/CartContext'

function ProductLink({
  item,
  className,
  children,
  image = false,
}: {
  item: CartItem
  className: string
  children: ReactNode
  image?: boolean
}) {
  return item.productSlug ? (
    <Link
      to={`/product/${item.productSlug}`}
      className={className}
      title={item.productName}
      aria-label={image ? `View ${item.productName}` : undefined}
    >
      {children}
    </Link>
  ) : (
    <div className={className} title={item.productName}>
      {children}
    </div>
  )
}

export function CartItemRow({
  item,
  disabled = false,
  showPrice = true,
  frozen = false,
}: {
  item: CartItem
  disabled?: boolean
  showPrice?: boolean
  frozen?: boolean
}) {
  const { updateQuantity, removeFromCart, loading } = useCart()
  return (
    <article className="checkout-bag-item">
      <ProductLink item={item} className="checkout-bag-item__image" image>
        <StoreImage
          framing="square"
          fallbackPresentation="icon"
          src={item.productImage || undefined}
          alt=""
          width={64}
          height={64}
          className="h-full w-full object-cover"
        />
      </ProductLink>
      <div className="checkout-bag-item__details">
        <ProductLink item={item} className="checkout-bag-item__title">
          {item.productName}
        </ProductLink>
        {(frozen || !item.inStock || !showPrice) && (
          <p className="mt-1 text-xs text-muted">
            {frozen
              ? `Quantity: ${item.quantity}`
              : !item.inStock
                ? 'Currently unavailable'
                : 'Checking price…'}
          </p>
        )}
      </div>
      <div className="checkout-bag-item__footer">
        {!frozen && (
          <div className="checkout-bag-item__controls">
            <QuantityControl
              quantity={item.quantity}
              maximum={item.availableStock}
              minimum={1}
              busy={disabled || loading}
              label={item.productName}
              className="quantity-control--checkout"
              onChange={(delta) => void updateQuantity(item.id, delta).catch(() => undefined)}
            />
            <button
              type="button"
              className="checkout-bag-item__remove"
              disabled={disabled || loading}
              aria-label={`Remove ${item.productName}`}
              title="Remove item"
              onClick={() => void removeFromCart(item.id).catch(() => undefined)}
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        )}
        <div className="checkout-bag-item__prices">
          {showPrice && item.quantity > 1 && (
            <p className="text-xs text-muted">
              {formatPrice(item.unitPrice)} × {item.quantity}
            </p>
          )}
          <p className="checkout-bag-item__price">
            {showPrice ? formatPrice(item.lineTotal) : '—'}
          </p>
        </div>
      </div>
    </article>
  )
}
export default CartItemRow
