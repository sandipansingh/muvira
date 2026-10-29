import { useEffect, useRef, useState } from 'react'
import { Plus, Truck } from 'lucide-react'
import { INDIAN_STATES } from '../../lib/constants/states.constants'
import { formatPrice } from '../../lib/utils/format'
import { Input } from '../ui/Input'
import { Button } from '../ui/Button'
import { Dropdown } from '../ui/Dropdown'
import { Textarea } from '../ui/Textarea'
import type { AddressData } from './AddressSelector'
import type { ShippingMethod, ShippingOption } from '../../types/checkout'

export interface ShippingFormData {
  firstName: string
  lastName: string
  email: string
  phone: string
  city: string
  state: string
  pincode: string
  description: string
}
export interface ShippingSectionProps {
  shippingData: ShippingFormData
  onShippingDataChange: (data: ShippingFormData) => void
  shippingMethod: ShippingMethod
  onShippingMethodChange: (method: ShippingMethod) => void
  shippingOptions?: Record<ShippingMethod, ShippingOption>
  savedAddresses?: AddressData[]
  selectedAddressId?: string
  onSelectSavedAddress?: (id: string) => void
  saving?: boolean
  errors?: Record<string, string>
}

export function ShippingSection({
  shippingData,
  onShippingDataChange,
  shippingMethod,
  onShippingMethodChange,
  shippingOptions,
  savedAddresses = [],
  selectedAddressId = '',
  onSelectSavedAddress,
  errors = {},
  saving = false,
}: ShippingSectionProps) {
  const [manual, setManual] = useState(!selectedAddressId)
  const onChange = useRef(onShippingDataChange)
  onChange.current = onShippingDataChange
  const email = useRef(shippingData.email)
  email.current = shippingData.email
  useEffect(() => {
    const address = savedAddresses.find((item) => item.id === selectedAddressId)
    if (!address) return
    const [firstName = '', ...rest] = address.fullName.split(' ')
    setManual(false)
    onChange.current({
      firstName,
      lastName: rest.join(' '),
      email: email.current,
      phone: address.phone,
      city: address.city,
      state: address.state,
      pincode: address.pincode,
      description: [address.streetAddress, address.apartment].filter(Boolean).join(', '),
    })
  }, [selectedAddressId, savedAddresses])
  const field = (name: keyof ShippingFormData, value: string) =>
    onShippingDataChange({ ...shippingData, [name]: value })
  const renderField = (item: { key: keyof ShippingFormData; label: string; complete: string }) => (
    <div key={item.key}>
      <label htmlFor={`shipping-${item.key}`} className="mb-2 block text-sm font-semibold">
        {item.label}
      </label>
      <Input
        id={`shipping-${item.key}`}
        value={shippingData[item.key]}
        autoComplete={item.complete}
        readOnly={item.key === 'email'}
        inputMode={
          item.key === 'phone' || item.key === 'pincode'
            ? 'numeric'
            : item.key === 'email'
              ? 'email'
              : 'text'
        }
        type={item.key === 'phone' ? 'tel' : item.key === 'email' ? 'email' : 'text'}
        maxLength={item.key === 'phone' ? 10 : item.key === 'pincode' ? 6 : 200}
        onChange={(event) =>
          field(
            item.key,
            item.key === 'phone' || item.key === 'pincode'
              ? event.target.value.replace(/\D/g, '')
              : event.target.value
          )
        }
        hasError={!!errors[item.key]}
        aria-invalid={!!errors[item.key]}
        aria-describedby={errors[item.key] ? `shipping-${item.key}-error` : undefined}
      />
      {errors[item.key] && (
        <p id={`shipping-${item.key}-error`} className="mt-1 text-sm text-danger">
          {errors[item.key]}
        </p>
      )}
    </div>
  )
  return (
    <div className="space-y-6">
      <section className="checkout-section" aria-labelledby="delivery-heading">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 id="delivery-heading" className="journey-section-title">
              Delivery address
            </h3>
          </div>
          {savedAddresses.length > 0 && (
            <Button
              variant="ghost"
              onClick={() => {
                setManual(!manual)
                if (!manual)
                  onShippingDataChange({ ...shippingData, description: '', city: '', pincode: '' })
                onSelectSavedAddress?.(
                  manual
                    ? savedAddresses.find((address) => address.isDefault)?.id ||
                        savedAddresses[0]?.id ||
                        ''
                    : ''
                )
              }}
              leftIcon={manual ? undefined : <Plus className="h-4 w-4" aria-hidden="true" />}
            >
              {manual ? 'Select saved address' : 'Add new address'}
            </Button>
          )}
        </div>
        {!manual && savedAddresses.length > 0 ? (
          <div>
            <label htmlFor="delivery-address" className="sr-only">
              Select a delivery address
            </label>
            <Dropdown
              id="delivery-address"
              aria-label="Select a delivery address"
              value={selectedAddressId}
              onChange={(id) => onSelectSavedAddress?.(id)}
              options={savedAddresses.map((address) => ({
                value: address.id,
                label: `${address.fullName} · ${address.city} ${address.pincode}${address.isDefault ? ' · Default' : ''}`,
              }))}
              className="w-full"
              menuClassName="w-full"
              triggerClassName="min-h-12 !text-base"
            />
            {savedAddresses
              .filter((address) => address.id === selectedAddressId)
              .map((address) => (
                <div key={address.id} className="mt-3 text-sm leading-5 text-muted">
                  <p className="font-semibold text-ink">{address.fullName}</p>
                  <p>
                    {[
                      address.streetAddress,
                      address.apartment,
                      address.city,
                      address.state,
                      address.pincode,
                    ]
                      .filter(Boolean)
                      .join(', ')}
                  </p>
                  <p className="mt-1">{address.phone}</p>
                </div>
              ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {(
              [
                { key: 'firstName', label: 'First name', complete: 'given-name' },
                { key: 'lastName', label: 'Last name (optional)', complete: 'family-name' },
                { key: 'email', label: 'Contact email', complete: 'email' },
                { key: 'phone', label: 'Phone number', complete: 'tel-national' },
              ] as const
            ).map(renderField)}
            <div className="sm:col-span-2">
              <label htmlFor="shipping-description" className="mb-2 block text-sm font-semibold">
                Street address
              </label>
              <Textarea
                id="shipping-description"
                autoComplete="street-address"
                rows={3}
                value={shippingData.description}
                onChange={(event) => field('description', event.target.value)}
                hasError={!!errors.description}
                aria-invalid={!!errors.description}
                aria-describedby={errors.description ? 'shipping-description-error' : undefined}
                className="resize-none"
              />
              {errors.description && (
                <p id="shipping-description-error" className="mt-1 text-sm text-danger">
                  {errors.description}
                </p>
              )}
            </div>
            {(
              [
                { key: 'city', label: 'City', complete: 'address-level2' },
                { key: 'pincode', label: 'PIN code', complete: 'postal-code' },
              ] as const
            ).map(renderField)}
            <div>
              <label
                id="shipping-state-label"
                htmlFor="shipping-state"
                className="mb-2 block text-sm font-semibold"
              >
                State
              </label>
              <Dropdown
                value={shippingData.state}
                options={INDIAN_STATES}
                onChange={(value) => field('state', value)}
                id="shipping-state"
                aria-label="State"
                className="w-full"
                menuClassName="w-full"
                triggerClassName="min-h-12 !text-base"
              />
            </div>
          </div>
        )}
        {manual && (
          <Button type="submit" variant="secondary" isLoading={saving} className="mt-4">
            Save address
          </Button>
        )}
        {!manual && (
          <p className="mt-5 border-t border-line pt-4 text-sm text-muted">
            Order updates will be sent to <span className="text-ink">{shippingData.email}</span>.
          </p>
        )}
      </section>
      <section className="checkout-section" aria-labelledby="shipping-heading">
        <div className="mb-4 flex items-center gap-3">
          <Truck className="h-5 w-5 text-muted" aria-hidden="true" />
          <h3 id="shipping-heading" className="journey-section-title">
            Delivery method
          </h3>
        </div>
        <fieldset className="grid gap-3 sm:grid-cols-2">
          <legend className="sr-only">Delivery method</legend>
          {(['standard', 'express'] as const).map((value) => {
            const option = shippingOptions?.[value]
            if (option && !option.enabled) return null
            const unavailable = !option?.enabled || option.available === false
            return (
              <label
                key={value}
                className={`checkout-delivery ${shippingMethod === value ? 'checkout-delivery--selected' : ''} ${unavailable ? 'opacity-50' : ''}`}
              >
                <input
                  type="radio"
                  name="shipping-method"
                  checked={shippingMethod === value}
                  disabled={unavailable}
                  onChange={() => onShippingMethodChange(value)}
                  className="h-4 w-4 accent-primary"
                />
                <span className="flex-1">
                  <span className="block text-sm font-semibold">
                    {option?.label ??
                      (value === 'standard' ? 'Standard shipping' : 'Express shipping')}
                  </span>
                  <span className="mt-1 block text-xs text-muted">
                    {option
                      ? !unavailable
                        ? option.description
                        : 'Currently unavailable'
                      : 'Checking availability…'}
                  </span>
                </span>
                <span className="text-sm font-semibold text-primary">
                  {unavailable
                    ? '—'
                    : option.amountPaisa === 0
                      ? 'Free'
                      : formatPrice(option.amountPaisa)}
                </span>
              </label>
            )
          })}
        </fieldset>
      </section>
    </div>
  )
}
