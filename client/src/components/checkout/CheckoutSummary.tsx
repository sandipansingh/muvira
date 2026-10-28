import { useState, type ReactNode } from 'react'
import { Check, Tag, X, ChevronDown, Package } from 'lucide-react'
import { useCart } from '../../context/CartContext'
import { useStickyPanel } from '../../lib/hooks/useStickyPanel'
import { StoreImage } from '../common/StoreImage'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { formatPrice } from '../../lib/utils/format'
import type { CheckoutPaymentSession, CheckoutQuote } from '../../types/checkout'
import type { CartItem } from '../../lib/types/cart'

export function CheckoutSummary({
  items,
  quote,
  session,
  loading,
  action,
}: {
  items: CartItem[]
  quote: CheckoutQuote | null
  session: CheckoutPaymentSession | null
  loading: boolean
  action?: ReactNode
}) {
  const { coupon, applyCoupon, removeCoupon } = useCart()
  const { panelRef, canStick } = useStickyPanel()
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const snapshot = session?.snapshot
  const lines = snapshot
    ? snapshot.items.map((item) => ({
        id: item.productId,
        name: item.productName,
        image: item.productImage,
        quantity: item.quantity,
        total: item.totalPricePaisa,
      }))
    : items.map((item) => ({
        id: item.id,
        name: item.productName,
        image: item.productImage,
        quantity: item.quantity,
        total: item.lineTotal,
      }))
  const subtotal = snapshot?.subtotalPaisa ?? quote?.subtotalPaisa
  const discount = snapshot?.discountAmountPaisa ?? quote?.discountAmountPaisa
  const shipping = snapshot?.shippingAmountPaisa ?? quote?.shippingAmountPaisa
  const total = session?.amountPaisa ?? quote?.totalAmountPaisa
  const couponCode = snapshot?.couponCode ?? coupon?.code
  const display = (amount?: number) => (amount === undefined ? '—' : formatPrice(amount))
  return (
    <aside
      ref={panelRef}
      className={`checkout-summary commerce-summary ${canStick ? 'commerce-summary--sticky' : ''}`}
      aria-label="Order summary"
    >
      <div className="checkout-summary-heading">
        <span className="checkout-eyebrow">Selected with care</span>
        <h2 className="font-display text-2xl font-normal">Your order</h2>
        {session && <p className="mt-2 text-xs text-muted">{session.orderNumber}</p>}
      </div>
      <details className="checkout-summary-details" open>
        <summary className="flex min-h-11 cursor-pointer items-center justify-between text-sm font-semibold lg:hidden">
          <span>
            Order details · {lines.reduce((count, line) => count + line.quantity, 0)} items
          </span>
          <ChevronDown className="h-4 w-4" aria-hidden="true" />
        </summary>
        <div className="checkout-summary-items">
          {lines.map((item) => (
            <div key={item.id} className="flex items-center gap-4">
              <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-control bg-paper">
                {item.image ? (
                  <StoreImage
                    src={item.image}
                    alt={item.name}
                    width={160}
                    height={160}
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-muted">
                    <Package className="h-6 w-6" aria-hidden="true" />
                  </div>
                )}
                <span className="absolute bottom-1 right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-ink px-1 text-xs text-paper">
                  {item.quantity}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold leading-relaxed">{item.name}</p>
                <p className="mt-1 text-sm text-muted">{display(item.total)}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="border-t border-line py-5">
          {couponCode ? (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Check className="h-4 w-4 text-primary" aria-hidden="true" />
              <span className="font-semibold">{couponCode}</span>
              <span className="text-muted">applied</span>
              {!session && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={removeCoupon}
                  aria-label="Remove coupon"
                  className="ml-auto"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ) : (
            !session && (
              <form
                noValidate
                onSubmit={(event) => {
                  event.preventDefault()
                  if (!code.trim() || busy) return
                  setBusy(true)
                  setError(null)
                  void applyCoupon(code.trim().toUpperCase())
                    .then((ok) => {
                      if (ok) setCode('')
                      else setError('This code could not be applied. Check it and try again.')
                    })
                    .catch((reason: unknown) =>
                      setError(
                        reason instanceof Error ? reason.message : 'Could not apply this code.'
                      )
                    )
                    .finally(() => setBusy(false))
                }}
              >
                <label htmlFor="checkout-coupon" className="mb-2 flex items-center gap-2 text-sm">
                  <Tag className="h-4 w-4" aria-hidden="true" />
                  Have a discount code?
                </label>
                <div className="flex gap-2">
                  <Input
                    id="checkout-coupon"
                    placeholder="Enter code"
                    value={code}
                    onChange={(event) => setCode(event.target.value)}
                    className="min-w-0 uppercase"
                  />
                  <Button
                    variant="secondary"
                    type="submit"
                    disabled={!code.trim()}
                    isLoading={busy}
                  >
                    Apply
                  </Button>
                </div>
                {error && (
                  <p role="alert" className="mt-2 text-sm text-danger">
                    {error}
                  </p>
                )}
              </form>
            )
          )}
        </div>
        <dl className="space-y-3 border-t border-line pt-5 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-muted">Subtotal</dt>
            <dd>{display(subtotal)}</dd>
          </div>
          {!!discount && (
            <div className="flex justify-between gap-3 text-primary">
              <dt>Discount</dt>
              <dd>−{display(discount)}</dd>
            </div>
          )}
          <div className="flex justify-between gap-3">
            <dt className="text-muted">Delivery</dt>
            <dd>{shipping === 0 ? 'Free' : display(shipping)}</dd>
          </div>
          {(snapshot?.taxAmountPaisa ?? quote?.taxAmountPaisa ?? 0) > 0 && (
            <div className="flex justify-between gap-3">
              <dt className="text-muted">Tax</dt>
              <dd>{display(snapshot?.taxAmountPaisa ?? quote?.taxAmountPaisa)}</dd>
            </div>
          )}
        </dl>
      </details>
      <div className="mt-5 flex items-baseline justify-between gap-3 border-t border-line pt-5">
        <span className="text-base font-semibold">Total</span>
        <span className="font-product text-2xl font-semibold text-primary">{display(total)}</span>
      </div>
      {loading && (
        <p className="mt-2 text-xs text-muted" role="status">
          Updating your total…
        </p>
      )}
      {action && (
        <div className="checkout-action-bar mt-6">
          <span className="checkout-action-total">
            <span className="block text-xs text-muted">Total</span>
            <span className="font-semibold text-primary">{display(total)}</span>
          </span>
          {action}
        </div>
      )}
      <p className="mt-5 text-center text-xs leading-relaxed text-muted">
        Payments processed by Razorpay
      </p>
    </aside>
  )
}
