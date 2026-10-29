import { useEffect, useRef } from 'react'
import { Minus, Plus } from 'lucide-react'
import { MAX_CART_ITEM_QTY } from '../../lib/constants/cart.constants'

export function QuantityControl({
  quantity,
  minimum = 1,
  maximum,
  busy,
  label,
  onChange,
  className = '',
}: {
  quantity: number
  minimum?: number
  maximum: number
  busy: boolean
  label: string
  onChange: (delta: number) => void
  className?: string
}) {
  const control = useRef<HTMLDivElement | null>(null)
  const pendingFocus = useRef<HTMLButtonElement | null>(null)
  const allowedMaximum = Math.min(maximum, MAX_CART_ITEM_QTY)
  const decreasedQuantity = Math.max(minimum, Math.min(quantity - 1, allowedMaximum))
  useEffect(() => {
    if (busy || !pendingFocus.current) return
    const button = pendingFocus.current
    pendingFocus.current = null
    if (
      !document.activeElement ||
      document.activeElement === document.body ||
      document.activeElement === button
    ) {
      const target = button.disabled
        ? control.current?.querySelector<HTMLButtonElement>('button:enabled') || control.current
        : button
      target?.focus()
    }
  }, [busy, quantity, allowedMaximum, minimum])
  return (
    <div
      ref={control}
      tabIndex={-1}
      className={`quantity-control ${className}`}
      role="group"
      aria-label={`Quantity for ${label}`}
      aria-busy={busy || undefined}
    >
      <button
        type="button"
        aria-label={
          decreasedQuantity < quantity - 1
            ? `Reduce quantity to ${decreasedQuantity}`
            : 'Decrease quantity'
        }
        disabled={busy || quantity <= minimum || allowedMaximum < minimum}
        onClick={(event) => {
          pendingFocus.current = event.currentTarget
          onChange(decreasedQuantity - quantity)
        }}
      >
        <Minus className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
      <output aria-live="polite" aria-label="Quantity">
        {quantity}
      </output>
      <button
        type="button"
        aria-label="Increase quantity"
        disabled={busy || quantity >= allowedMaximum}
        onClick={(event) => {
          pendingFocus.current = event.currentTarget
          onChange(1)
        }}
      >
        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </div>
  )
}
