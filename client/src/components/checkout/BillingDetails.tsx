import { Input } from '../ui/Input'
import { Dropdown } from '../ui/Dropdown'
import { INDIAN_STATES } from '../../lib/constants/states.constants'
import type { BillingAddressInput } from '../../types/checkout'

export const EMPTY_BILLING_ADDRESS: BillingAddressInput = {
  fullName: '',
  line1: '',
  line2: '',
  city: '',
  state: 'West Bengal',
  pincode: '',
  country: 'India',
  gstNumber: '',
}

export function billingErrors(value: BillingAddressInput): Record<string, string> {
  const errors: Record<string, string> = {}
  for (const key of ['fullName', 'line1', 'city', 'state'] as const)
    if (!value[key].trim()) errors[key] = 'This field is required.'
  if (!/^\d{6}$/.test(value.pincode)) errors.pincode = 'Enter a 6-digit PIN code.'
  if (value.gstNumber && !/^[A-Z0-9]{15}$/.test(value.gstNumber))
    errors.gstNumber = 'Enter a valid 15-character GSTIN.'
  return errors
}

export function BillingDetails({
  sameAsShipping,
  onSameChange,
  value,
  onChange,
  errors,
}: {
  sameAsShipping: boolean
  onSameChange: (same: boolean) => void
  value: BillingAddressInput
  onChange: (value: BillingAddressInput) => void
  errors: Record<string, string>
}) {
  return (
    <section className="checkout-section" aria-labelledby="billing-heading">
      <div className="mb-5">
        <h2 id="billing-heading" className="journey-section-title">
          Billing details
        </h2>
      </div>
      <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
        <input
          type="checkbox"
          checked={sameAsShipping}
          onChange={(event) => onSameChange(event.target.checked)}
          className="h-4 w-4 accent-primary"
        />
        Same as delivery address
      </label>
      {!sameAsShipping && (
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {(
            [
              { key: 'fullName', label: 'Billing name', complete: 'billing name' },
              { key: 'line1', label: 'Billing address', complete: 'billing address-line1' },
              {
                key: 'line2',
                label: 'Apartment or landmark (optional)',
                complete: 'billing address-line2',
              },
              { key: 'city', label: 'Billing city', complete: 'billing address-level2' },
              { key: 'pincode', label: 'Billing PIN code', complete: 'billing postal-code' },
              { key: 'gstNumber', label: 'GSTIN (optional)', complete: 'off' },
            ] as const
          ).map((field) => (
            <div key={field.key}>
              <label htmlFor={`billing-${field.key}`} className="mb-2 block text-sm font-semibold">
                {field.label}
              </label>
              <Input
                id={`billing-${field.key}`}
                autoComplete={field.complete}
                value={value[field.key] ?? ''}
                onChange={(event) =>
                  onChange({
                    ...value,
                    [field.key]:
                      field.key === 'pincode'
                        ? event.target.value.replace(/\D/g, '').slice(0, 6)
                        : field.key === 'gstNumber'
                          ? event.target.value
                              .toUpperCase()
                              .replace(/[^A-Z0-9]/g, '')
                              .slice(0, 15)
                          : event.target.value,
                  })
                }
                inputMode={field.key === 'pincode' ? 'numeric' : 'text'}
                hasError={!!errors[field.key]}
                aria-invalid={!!errors[field.key]}
                aria-describedby={errors[field.key] ? `billing-${field.key}-error` : undefined}
              />
              {errors[field.key] && (
                <p id={`billing-${field.key}-error`} className="mt-1 text-sm text-danger">
                  {errors[field.key]}
                </p>
              )}
            </div>
          ))}
          <div>
            <label
              id="billing-state-label"
              htmlFor="billing-state"
              className="mb-2 block text-sm font-semibold"
            >
              Billing state
            </label>
            <Dropdown
              value={value.state}
              onChange={(state) => onChange({ ...value, state })}
              options={INDIAN_STATES}
              id="billing-state"
              aria-label="Billing state"
              className="w-full"
              triggerClassName="min-h-12 !text-base"
            />
          </div>
        </div>
      )}
    </section>
  )
}
