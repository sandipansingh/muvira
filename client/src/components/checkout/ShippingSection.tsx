import React, { useState, useEffect, useRef } from 'react'
import { INDIAN_STATES } from '../../lib/constants/states.constants'
import { Check, Truck, Zap } from 'lucide-react'
import type { AddressData } from './AddressSelector'
import type { ShippingMethod, ShippingOption } from '../../types/checkout'
import { formatPrice } from '../../lib/utils/format'

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
  onSelectSavedAddress?: (addressId: string) => void
}

export const ShippingSection: React.FC<ShippingSectionProps> = ({
  shippingData,
  onShippingDataChange,
  shippingMethod,
  onShippingMethodChange,
  savedAddresses = [],
  selectedAddressId = '',
  onSelectSavedAddress,
  shippingOptions,
}) => {
  const [useManualForm, setUseManualForm] = useState(savedAddresses.length === 0)
  const [countryCode, setCountryCode] = useState('+91')

  const onShippingDataChangeRef = useRef(onShippingDataChange)
  onShippingDataChangeRef.current = onShippingDataChange

  const emailRef = useRef(shippingData.email)
  emailRef.current = shippingData.email

  // When saved address selection changes, populate shippingData fields
  useEffect(() => {
    if (selectedAddressId && savedAddresses.length > 0) {
      const matched = savedAddresses.find((a) => a.id === selectedAddressId)
      if (matched) {
        const names = (matched.fullName || '').split(' ')
        const firstName = names[0] || ''
        const lastName = names.slice(1).join(' ') || ''
        onShippingDataChangeRef.current({
          firstName,
          lastName,
          email: emailRef.current,
          phone: matched.phone || '',
          city: matched.city || '',
          state: matched.state || 'West Bengal',
          pincode: matched.pincode || '',
          description: matched.streetAddress + (matched.apartment ? `, ${matched.apartment}` : ''),
        })
      }
    }
  }, [selectedAddressId, savedAddresses])

  useEffect(() => {
    if (selectedAddressId && savedAddresses.length > 0) setUseManualForm(false)
  }, [savedAddresses.length, selectedAddressId])

  const toggleAddressMode = () => {
    const nextManualState = !useManualForm
    setUseManualForm(nextManualState)
    if (nextManualState) onSelectSavedAddress?.('')
  }

  const handleFieldChange = (field: keyof ShippingFormData, value: string) => {
    onShippingDataChange({
      ...shippingData,
      [field]: value,
    })
  }

  return (
    <div className="space-y-8">
      {/* Shipping Address Header & Form */}
      <section className="space-y-5 rounded-3xl border border-[var(--color-line)] bg-[var(--color-paper)] p-5 sm:p-7 shadow-xs">
        <div className="flex items-center justify-between border-b border-[var(--color-line)] pb-4">
          <h2 className="font-display text-xl sm:text-2xl font-bold text-[var(--color-ink)]">
            Shipping Address
          </h2>

          {savedAddresses.length > 0 && (
            <button
              type="button"
              onClick={toggleAddressMode}
              className="inline-flex cursor-pointer items-center gap-1 text-xs font-semibold text-[var(--color-primary)] hover:underline"
            >
              {useManualForm ? 'Select Saved Address' : '+ Enter Custom Address'}
            </button>
          )}
        </div>

        {/* Saved Addresses List (if available and not using manual override) */}
        {!useManualForm && savedAddresses.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs text-[var(--color-muted)] font-medium">
              Select a delivery destination:
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {savedAddresses.map((addr) => (
                <div
                  key={addr.id}
                  onClick={() => onSelectSavedAddress?.(addr.id)}
                  className={`cursor-pointer rounded-2xl border p-4 transition-all ${
                    selectedAddressId === addr.id
                      ? 'border-[var(--color-primary)] bg-[var(--color-primary-soft)] ring-1 ring-[var(--color-primary)] shadow-xs'
                      : 'border-[var(--color-line)] bg-[var(--color-paper)] hover:border-[var(--color-field-border)] hover:bg-[var(--color-surface)]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-[var(--color-ink)]">
                      {addr.fullName}
                    </span>
                    {selectedAddressId === addr.id && (
                      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[var(--color-primary)] text-white">
                        <Check className="h-3 w-3 stroke-[3]" />
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-[var(--color-ink-soft)] line-clamp-2">
                    {addr.streetAddress}
                    {addr.apartment ? `, ${addr.apartment}` : ''}
                  </p>
                  <p className="mt-1 text-[11px] text-[var(--color-muted)]">
                    {addr.city}, {addr.state} {addr.pincode} &bull; {addr.phone}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Form Fields Grid matching Reference #2 */}
        {(useManualForm || savedAddresses.length === 0) && (
          <div className="space-y-4">
            {/* Row 1: First Name & Last Name (2 cols) */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-[var(--color-ink)]">
                  First Name*
                </label>
                <input
                  type="text"
                  required
                  placeholder="First name"
                  value={shippingData.firstName}
                  onChange={(e) => handleFieldChange('firstName', e.target.value)}
                  className="w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] px-3.5 py-2.5 text-base text-[var(--color-ink)] placeholder:text-[var(--color-muted)] focus:border-[var(--color-primary)] focus:bg-[var(--color-paper)] focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-[var(--color-ink)]">
                  Last Name*
                </label>
                <input
                  type="text"
                  required
                  placeholder="Last name"
                  value={shippingData.lastName}
                  onChange={(e) => handleFieldChange('lastName', e.target.value)}
                  className="w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] px-3.5 py-2.5 text-base text-[var(--color-ink)] placeholder:text-[var(--color-muted)] focus:border-[var(--color-primary)] focus:bg-[var(--color-paper)] focus:outline-none"
                />
              </div>
            </div>

            {/* Row 2: Email & Phone number with IND selector (2 cols) */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-[var(--color-ink)]">
                  Email*
                </label>
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={shippingData.email}
                  onChange={(e) => handleFieldChange('email', e.target.value)}
                  className="w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] px-3.5 py-2.5 text-base text-[var(--color-ink)] placeholder:text-[var(--color-muted)] focus:border-[var(--color-primary)] focus:bg-[var(--color-paper)] focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-[var(--color-ink)]">
                  Phone number*
                </label>
                <div className="flex rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] focus-within:border-[var(--color-primary)] focus-within:bg-[var(--color-paper)]">
                  <select
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    className="rounded-l-xl border-r border-[var(--color-line)] bg-transparent px-2.5 py-2.5 text-xs font-semibold text-[var(--color-ink)] focus:outline-none"
                  >
                    <option value="+91">IND +91</option>
                    <option value="+1">USA +1</option>
                    <option value="+44">UK +44</option>
                    <option value="+971">UAE +971</option>
                  </select>
                  <input
                    type="tel"
                    required
                    placeholder="9876543210"
                    value={shippingData.phone}
                    onChange={(e) =>
                      handleFieldChange('phone', e.target.value.replace(/\D/g, '').slice(0, 10))
                    }
                    className="w-full rounded-r-xl bg-transparent px-3 py-2.5 text-base text-[var(--color-ink)] placeholder:text-[var(--color-muted)] focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Row 3: City, State, Zip Code (3 cols) */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-[var(--color-ink)]">
                  City*
                </label>
                <input
                  type="text"
                  required
                  placeholder="Kolkata / City"
                  value={shippingData.city}
                  onChange={(e) => handleFieldChange('city', e.target.value)}
                  className="w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] px-3.5 py-2.5 text-base text-[var(--color-ink)] placeholder:text-[var(--color-muted)] focus:border-[var(--color-primary)] focus:bg-[var(--color-paper)] focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-[var(--color-ink)]">
                  State*
                </label>
                <select
                  value={shippingData.state}
                  onChange={(e) => handleFieldChange('state', e.target.value)}
                  className="w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] px-3.5 py-2.5 text-base text-[var(--color-ink)] focus:border-[var(--color-primary)] focus:bg-[var(--color-paper)] focus:outline-none"
                >
                  {INDIAN_STATES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-[var(--color-ink)]">
                  Zip Code*
                </label>
                <input
                  type="text"
                  required
                  placeholder="700001"
                  maxLength={6}
                  value={shippingData.pincode}
                  onChange={(e) =>
                    handleFieldChange('pincode', e.target.value.replace(/\D/g, '').slice(0, 6))
                  }
                  className="w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] px-3.5 py-2.5 text-base text-[var(--color-ink)] placeholder:text-[var(--color-muted)] focus:border-[var(--color-primary)] focus:bg-[var(--color-paper)] focus:outline-none"
                />
              </div>
            </div>

            {/* Row 4: Description / Street Address (textarea matching Reference #2) */}
            <div>
              <label className="mb-1 block text-xs font-semibold text-[var(--color-ink)]">
                Description* / Street Address
              </label>
              <textarea
                rows={3}
                required
                placeholder="Enter street address, building, landmark..."
                value={shippingData.description}
                onChange={(e) => handleFieldChange('description', e.target.value)}
                className="w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] p-3.5 text-base text-[var(--color-ink)] placeholder:text-[var(--color-muted)] focus:border-[var(--color-primary)] focus:bg-[var(--color-paper)] focus:outline-none"
              />
            </div>
          </div>
        )}
      </section>

      {/* Shipping Method Section matching Reference #2 */}
      <section className="space-y-4 rounded-3xl border border-[var(--color-line)] bg-[var(--color-paper)] p-5 sm:p-7 shadow-xs">
        <h2 className="font-display text-lg sm:text-xl font-bold text-[var(--color-ink)] flex items-center gap-2">
          <Truck className="h-5 w-5 text-[var(--color-primary)] shrink-0" />
          Shipping Method
        </h2>

        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          {/* Free Shipping Radio Card */}
          <label
            onClick={() => onShippingMethodChange('standard')}
            className={`flex cursor-pointer items-center justify-between rounded-2xl border p-4 transition-all ${
              shippingMethod === 'standard'
                ? 'border-[var(--color-ink)] bg-[var(--color-surface)] shadow-xs'
                : 'border-[var(--color-line)] bg-[var(--color-paper)] hover:border-[var(--color-field-border)]'
            }`}
          >
            <div className="flex items-center gap-3">
              <input
                type="radio"
                name="shipping-method"
                checked={shippingMethod === 'standard'}
                onChange={() => onShippingMethodChange('standard')}
                className="h-4 w-4 accent-[var(--color-ink)]"
              />
              <div className="space-y-0.5">
                <span className="text-xs sm:text-sm font-bold text-[var(--color-ink)]">
                  {shippingOptions?.standard.label ?? 'Standard Shipping'}
                </span>
                <p className="text-[11px] text-[var(--color-muted)]">
                  {shippingOptions?.standard.description ?? 'Calculating delivery estimate…'}
                </p>
              </div>
            </div>

            <span className="font-sans text-xs sm:text-sm font-bold text-accent">
              {shippingOptions
                ? shippingOptions.standard.amountPaisa === 0
                  ? 'FREE'
                  : formatPrice(shippingOptions.standard.amountPaisa)
                : '—'}
            </span>
          </label>

          {/* Express Shipping Radio Card */}
          <label
            onClick={() => onShippingMethodChange('express')}
            className={`flex cursor-pointer items-center justify-between rounded-2xl border p-4 transition-all ${
              shippingMethod === 'express'
                ? 'border-[var(--color-ink)] bg-[var(--color-surface)] shadow-xs'
                : 'border-[var(--color-line)] bg-[var(--color-paper)] hover:border-[var(--color-field-border)]'
            }`}
          >
            <div className="flex items-center gap-3">
              <input
                type="radio"
                name="shipping-method"
                checked={shippingMethod === 'express'}
                onChange={() => onShippingMethodChange('express')}
                className="h-4 w-4 accent-[var(--color-ink)]"
              />
              <div className="space-y-0.5">
                <span className="text-xs sm:text-sm font-bold text-[var(--color-ink)] flex items-center gap-1">
                  <Zap className="h-3.5 w-3.5 text-warning shrink-0" />
                  {shippingOptions?.express.label ?? 'Express Shipping'}
                </span>
                <p className="text-[11px] text-[var(--color-muted)]">
                  {shippingOptions?.express.description ?? 'Calculating delivery estimate…'}
                </p>
              </div>
            </div>

            <span className="font-sans text-xs sm:text-sm font-bold text-[var(--color-primary)]">
              {shippingOptions
                ? shippingOptions.express.amountPaisa === 0
                  ? 'FREE'
                  : formatPrice(shippingOptions.express.amountPaisa)
                : '—'}
            </span>
          </label>
        </div>
      </section>
    </div>
  )
}

export default ShippingSection
