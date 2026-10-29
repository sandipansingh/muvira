import type { CartItem } from '../../lib/types/cart'
import { formatPrice } from '../../lib/utils/format'
import { useCart } from '../../context/CartContext'
import { useStickyPanel } from '../../lib/hooks/useStickyPanel'
import { CouponInput } from '../cart/CouponInput'
import { Button } from '../ui/Button'

export interface FlowCartSidebarProps {
  items: CartItem[]
  subtotalPaisa: number
  discountPaisa: number
  shippingPaisa: number
  totalPaisa: number
  onProceed: () => void
  isProcessing?: boolean
  buttonLabel?: string
  disabled?: boolean
  collapsibleOnMobile?: boolean
}
export function FlowCartSidebar({
  items,
  subtotalPaisa,
  discountPaisa,
  shippingPaisa,
  totalPaisa,
  onProceed,
  isProcessing = false,
  buttonLabel = 'Continue to Payment',
  disabled = false,
}: FlowCartSidebarProps) {
  const { error } = useCart()
  const { panelRef, canStick } = useStickyPanel()
  return (
    <aside
      ref={panelRef}
      className={`commerce-summary journey-stack ${canStick ? 'commerce-summary--sticky' : ''}`}
      aria-label="Cart summary"
    >
      <section className="journey-card">
        <CouponInput />
      </section>
      <section className="journey-card">
        <h2 className="journey-section-title mb-5">Price details</h2>
        <dl className="journey-totals">
          <div>
            <dt>Subtotal</dt>
            <dd>{formatPrice(subtotalPaisa)}</dd>
          </div>
          {discountPaisa > 0 && (
            <div>
              <dt>Discount</dt>
              <dd>−{formatPrice(discountPaisa)}</dd>
            </div>
          )}
          <div>
            <dt>Shipping</dt>
            <dd>
              {error ? 'Unavailable' : shippingPaisa === 0 ? 'Free' : formatPrice(shippingPaisa)}
            </dd>
          </div>
          <div className="journey-total">
            <dt>Total</dt>
            <dd>{formatPrice(totalPaisa)}</dd>
          </div>
        </dl>
        <Button
          className="mt-6 w-full"
          size="lg"
          onClick={onProceed}
          disabled={disabled || items.length === 0}
          isLoading={isProcessing}
        >
          {buttonLabel}
        </Button>
      </section>
    </aside>
  )
}
export default FlowCartSidebar
