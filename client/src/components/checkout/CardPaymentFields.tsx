import type { RefObject } from 'react'
import { LockKeyhole } from 'lucide-react'
import { Input } from '../ui/Input'
import { formatCardInput, type CardDetails } from '../../lib/validators/payment.validator'

const FIELDS = [
  {
    name: 'name',
    label: 'Name on card',
    autoComplete: 'cc-name',
    placeholder: 'As printed on your card',
    maxLength: 100,
  },
  {
    name: 'number',
    label: 'Card number',
    autoComplete: 'cc-number',
    placeholder: '0000 0000 0000 0000',
    maxLength: 23,
  },
  { name: 'expiry', label: 'Expiry', autoComplete: 'cc-exp', placeholder: 'MM/YY', maxLength: 7 },
  {
    name: 'securityCode',
    label: 'Security code',
    autoComplete: 'cc-csc',
    placeholder: 'CVV',
    maxLength: 4,
  },
] as const

export function CardPaymentFields({
  containerRef,
  errors,
  disabled,
}: {
  containerRef: RefObject<HTMLDivElement | null>
  errors: Partial<Record<keyof CardDetails, string>>
  disabled: boolean
}) {
  return (
    <div ref={containerRef} className="grid grid-cols-2 gap-4">
      {FIELDS.map((field) => (
        <div
          key={field.name}
          className={field.name === 'name' || field.name === 'number' ? 'col-span-2' : ''}
        >
          <label htmlFor={`payment-${field.name}`} className="mb-2 block text-sm font-semibold">
            {field.label}
          </label>
          <Input
            id={`payment-${field.name}`}
            name={field.name}
            autoComplete={field.autoComplete}
            type={field.name === 'securityCode' ? 'password' : 'text'}
            inputMode={field.name === 'name' ? 'text' : 'numeric'}
            placeholder={field.placeholder}
            maxLength={field.maxLength}
            onInput={(event) => {
              event.currentTarget.value = formatCardInput(field.name, event.currentTarget.value)
            }}
            hasError={!!errors[field.name]}
            aria-invalid={!!errors[field.name]}
            aria-describedby={errors[field.name] ? `payment-${field.name}-error` : undefined}
            disabled={disabled}
          />
          {errors[field.name] && (
            <p id={`payment-${field.name}-error`} className="mt-1 text-sm text-danger">
              {errors[field.name]}
            </p>
          )}
        </div>
      ))}
      <p className="col-span-2 flex items-start gap-2 text-xs leading-relaxed text-muted">
        <LockKeyhole className="mt-0.5 h-4 w-4" aria-hidden="true" />
        Card details are sent directly to Razorpay and aren’t saved by Muvira.
      </p>
    </div>
  )
}
