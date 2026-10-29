import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ShoppingBag } from 'lucide-react'
import { CartItemRow } from '../cart/CartItemRow'
import { useCart } from '../../context/CartContext'
import { Button } from '../ui/Button'
import { formatPrice } from '../../lib/utils/format'
import type { CheckoutPaymentSession, CheckoutQuote } from '../../types/checkout'

export function CheckoutBag({
  quote,
  session,
  disabled,
  authenticated,
}: {
  quote: CheckoutQuote | null
  session: CheckoutPaymentSession | null
  disabled: boolean
  authenticated: boolean
}) {
  const { items, status, error, retry, hasUnmergedItems } = useCart()
  const lines = session
    ? session.snapshot.items.map((item) => ({
        id: item.productId,
        productId: item.productId,
        productName: item.productName,
        productSlug:
          items.find((candidate) => candidate.productId === item.productId)?.productSlug || '',
        productImage: item.productImage || '',
        quantity: item.quantity,
        unitPrice: item.unitPricePaisa,
        lineTotal: item.totalPricePaisa,
        inStock: true,
        availableStock: item.quantity,
      }))
    : items.map((item) => {
        const authoritative = quote?.items.find((line) => line.productId === item.productId)
        return authoritative
          ? {
              ...item,
              productName: authoritative.productName,
              unitPrice: authoritative.unitPricePaisa,
              lineTotal: authoritative.lineTotalPaisa,
            }
          : item
      })
  return (
    <section
      className="checkout-section checkout-bag"
      aria-labelledby="bag-heading"
      aria-busy={status !== 'ready' && !session}
    >
      <h2 id="bag-heading" className="journey-section-title">
        Order summary
      </h2>
      {session && <p className="mt-2 text-xs text-muted">{session.orderNumber} · Reviewed order</p>}
      {!session && status !== 'ready' ? (
        <div className="py-5" role={status === 'error' ? 'alert' : 'status'}>
          <p className="text-sm text-muted">
            {status === 'error'
              ? error
              : status === 'merging'
                ? 'Synchronising your bag…'
                : 'Loading your bag…'}
          </p>
          {status === 'error' && (
            <Button variant="secondary" className="mt-3" onClick={retry}>
              Retry loading cart
            </Button>
          )}
        </div>
      ) : lines.length ? (
        <div className="mt-4 divide-y divide-line">
          {lines.map((item) => (
            <CartItemRow
              key={item.id}
              item={item}
              disabled={disabled}
              frozen={!!session}
              showPrice={
                !!session ||
                !authenticated ||
                !!quote?.items.some((line) => line.productId === item.productId)
              }
            />
          ))}
        </div>
      ) : (
        <div className="py-8 text-center">
          <ShoppingBag className="mx-auto mb-3 h-6 w-6 text-muted" aria-hidden="true" />
          <h3 className="font-sans text-sm font-semibold">Your bag is empty</h3>
          <p className="mt-2 text-sm text-muted">Add something from the shop to get started.</p>
        </div>
      )}
      {!session && status === 'ready' && (error || hasUnmergedItems) && (
        <div role="alert" className="mt-4 text-sm text-danger">
          <p>
            {error ||
              'Some saved items are unavailable. Remove them or correct their quantity, then retry.'}
          </p>
          <Button variant="secondary" className="mt-2" onClick={retry} disabled={disabled}>
            Retry bag
          </Button>
        </div>
      )}
    </section>
  )
}

export function CheckoutTotals({
  quote,
  session,
  loading,
  children,
  error,
  onRetry,
}: {
  quote: CheckoutQuote | null
  session: CheckoutPaymentSession | null
  loading: boolean
  children: ReactNode
  error?: string | null
  onRetry?: () => void
}) {
  const snapshot = session?.snapshot
  const display = (value?: number) => (value === undefined ? '—' : formatPrice(value))
  const shipping = snapshot?.shippingAmountPaisa ?? quote?.shippingAmountPaisa
  const discount = snapshot?.discountAmountPaisa ?? quote?.discountAmountPaisa
  const tax = snapshot?.taxAmountPaisa ?? quote?.taxAmountPaisa
  return (
    <div className="checkout-totals">
      <section className="checkout-section" aria-labelledby="total-heading" aria-busy={loading}>
        <h2 id="total-heading" className="journey-section-title">
          Order total
        </h2>
        <dl className="checkout-total-breakdown mt-5 space-y-3 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-ink-soft">Subtotal</dt>
            <dd>{display(snapshot?.subtotalPaisa ?? quote?.subtotalPaisa)}</dd>
          </div>
          {!!discount && (
            <div className="flex justify-between gap-3 text-primary">
              <dt>Discount</dt>
              <dd>−{display(discount)}</dd>
            </div>
          )}
          <div className="flex justify-between gap-3">
            <dt className="text-ink-soft">Delivery</dt>
            <dd>{shipping === 0 ? 'Free' : display(shipping)}</dd>
          </div>
          {!!tax && (
            <div className="flex justify-between gap-3">
              <dt className="text-ink-soft">Tax</dt>
              <dd>{display(tax)}</dd>
            </div>
          )}
          <div className="checkout-total-final flex justify-between gap-3 border-t border-line pt-4">
            <dt>Total</dt>
            <dd className="text-primary">
              {display(session?.amountPaisa ?? quote?.totalAmountPaisa)}
            </dd>
          </div>
        </dl>
        {loading && (
          <p role="status" className="mt-3 text-xs text-muted">
            Updating your total…
          </p>
        )}
        {error && (
          <div role="alert" className="mt-4 text-sm text-danger">
            <p>{error}</p>
            <Button variant="secondary" className="mt-2" onClick={onRetry}>
              Retry calculating total
            </Button>
          </div>
        )}
        {!quote && !session && !loading && !error && (
          <p className="mt-4 text-xs text-muted">
            Your total is confirmed after sign in and delivery selection.
          </p>
        )}
      </section>
      {children}
      <Link
        to="/shop"
        className="button-secondary flex min-h-11 w-full items-center justify-center text-sm"
      >
        Continue shopping
      </Link>
    </div>
  )
}
