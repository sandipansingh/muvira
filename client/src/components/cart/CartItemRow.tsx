import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
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
        <p className="mt-1 text-xs text-muted">
          {frozen
            ? `Quantity: ${item.quantity}`
            : !item.inStock
              ? 'Currently unavailable'
              : showPrice
                ? `${formatPrice(item.unitPrice)} each`
                : 'Checking price…'}
        </p>
      </div>
      <p className="checkout-bag-item__price">{showPrice ? formatPrice(item.lineTotal) : '—'}</p>
      {!frozen && (
        <div className="checkout-bag-item__controls">
          <QuantityControl
            quantity={item.quantity}
            maximum={item.availableStock}
            minimum={1}
            busy={disabled || loading}
            label={item.productName}
            onChange={(delta) => void updateQuantity(item.id, delta).catch(() => undefined)}
          />
          <button
            type="button"
            className="min-h-11 px-2 text-xs text-muted hover:text-danger disabled:opacity-50"
            disabled={disabled || loading}
            aria-label={`Remove ${item.productName}`}
            onClick={() => void removeFromCart(item.id).catch(() => undefined)}
          >
            Remove
          </button>
        </div>
      )}
    </article>
  )
}
export default CartItemRow
