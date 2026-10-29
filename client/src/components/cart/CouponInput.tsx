import { useId, useRef, useState } from 'react'
import { Check, X } from 'lucide-react'
import { useCart } from '../../context/CartContext'
import { formatPrice } from '../../lib/utils/format'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'

export function CouponInput({ disabled = false }: { disabled?: boolean }) {
  const { coupon, applyCoupon, removeCoupon } = useCart()
  const id = useId()
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const pending = useRef(false)
  return (
    <div>
      {coupon ? (
        <div className="coupon-applied">
          <Check className="h-4 w-4 shrink-0" aria-hidden="true" />
          <div className="min-w-0">
            <p className="font-semibold break-words">{coupon.code}</p>
            <p className="mt-1 text-sm">−{formatPrice(coupon.discountAmount)} applied</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={removeCoupon}
            disabled={disabled}
            aria-label="Remove coupon"
            className="ml-auto shrink-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <form
          noValidate
          onSubmit={(event) => {
            event.preventDefault()
            if (disabled || !code.trim() || pending.current) return
            pending.current = true
            setBusy(true)
            setError(null)
            void applyCoupon(code.trim().toUpperCase())
              .then((ok) => {
                if (ok) setCode('')
                else setError('This code could not be applied. Check it and try again.')
              })
              .catch((reason: unknown) =>
                setError(reason instanceof Error ? reason.message : 'Could not apply this code.')
              )
              .finally(() => {
                pending.current = false
                setBusy(false)
              })
          }}
        >
          <label htmlFor={id} className="sr-only">
            Promo code
          </label>
          <div className="flex flex-wrap gap-2">
            <Input
              disabled={disabled}
              id={id}
              name="coupon"
              placeholder="Enter promo code"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              className="min-w-0 flex-[1_1_8rem] uppercase placeholder:normal-case"
            />
            <Button
              type="submit"
              variant="secondary"
              disabled={disabled || !code.trim()}
              isLoading={busy}
            >
              Apply
            </Button>
          </div>
        </form>
      )}
      {error && (
        <p role="alert" className="mt-3 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  )
}
export default CouponInput
