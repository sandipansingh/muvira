import React, { useState } from 'react'
import { Plus } from 'lucide-react'
import { INDIAN_STATES } from '../../lib/constants/states.constants'

export interface AddressData {
  id: string
  fullName: string
  label: string
  streetAddress: string
  apartment?: string
  city: string
  state: string
  pincode: string
  phone: string
  isDefault: boolean
}

interface AddressSelectorProps {
  selectedAddressId: string
  onSelectAddressId: (id: string) => void
  addresses: AddressData[]
  onAddNewAddress: (address: Omit<AddressData, 'id'>) => void
}

export const AddressSelector: React.FC<AddressSelectorProps> = ({
  selectedAddressId,
  onSelectAddressId,
  addresses,
  onAddNewAddress,
}) => {
  const [showAddForm, setShowAddForm] = useState(false)
  const [fullName, setFullName] = useState('')
  const [streetAddress, setStreetAddress] = useState('')
  const [apartment, setApartment] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('West Bengal')
  const [pincode, setPincode] = useState('')
  const [phone, setPhone] = useState('')

  const resetForm = () => {
    setFullName('')
    setStreetAddress('')
    setApartment('')
    setCity('')
    setPincode('')
    setPhone('')
  }

  const handleFormSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!fullName || !streetAddress || !city || !pincode || !phone) return
    onAddNewAddress({
      fullName,
      label: 'Address',
      streetAddress,
      apartment,
      city,
      state,
      pincode,
      phone,
      isDefault: addresses.length === 0,
    })
    setShowAddForm(false)
    resetForm()
  }

  return (
    <section className="border-b border-[var(--color-line)] pb-6">
      <div className="flex items-center justify-between gap-4">
        <h2 className="font-display text-xl font-bold text-[var(--color-ink)]">Delivery Address</h2>
        <button
          type="button"
          onClick={() => setShowAddForm((open) => !open)}
          className="inline-flex cursor-pointer items-center gap-1 text-xs font-bold leading-none text-[var(--color-ink)] hover:underline"
        >
          <Plus className="h-3.5 w-3.5 shrink-0" />
          <span className="leading-none">Add new</span>
        </button>
      </div>
      <div className="mt-5 space-y-3">
        {addresses.length === 0 && (
          <p className="border-y border-[var(--color-line)] py-4 text-xs text-[var(--color-muted)] sm:text-sm">
            No saved addresses yet. Add one to continue.
          </p>
        )}
        {addresses.map((address) => (
          <label
            key={address.id}
            className={`flex cursor-pointer items-start gap-3 rounded-[var(--radius-control)] border p-4 transition-colors ${
              selectedAddressId === address.id
                ? 'border-[var(--color-ink)] bg-[var(--color-surface)]'
                : 'border-[var(--color-line)] hover:bg-[var(--color-surface)]'
            }`}
          >
            <input
              type="radio"
              name="delivery-address"
              checked={selectedAddressId === address.id}
              onChange={() => onSelectAddressId(address.id)}
              className="mt-1 accent-neutral-900"
            />
            <div className="flex-1 text-xs leading-5 text-neutral-500">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-bold text-[var(--color-ink)]">
                  {address.fullName} — {address.label}
                </span>
                {address.isDefault && <span className="status-badge">Default</span>}
              </div>
              <p className="mt-0.5 font-medium text-[var(--color-ink-soft)]">
                {address.streetAddress}
                {address.apartment ? `, ${address.apartment}` : ''}
              </p>
              <p className="text-[var(--color-muted)]">
                {address.city}, {address.state} {address.pincode} · {address.phone}
              </p>
            </div>
          </label>
        ))}
      </div>

      {showAddForm && (
        <form onSubmit={handleFormSubmit} className="soft-panel mt-5 space-y-3 p-5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
            Enter shipping details
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              id="address-full-name"
              name="fullName"
              type="text"
              required
              placeholder="Full name"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              className="input"
            />
            <input
              id="address-phone"
              name="phone"
              type="tel"
              required
              placeholder="Phone number"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              className="input"
            />
          </div>
          <input
            id="address-line1"
            name="streetAddress"
            type="text"
            required
            placeholder="Street address"
            value={streetAddress}
            onChange={(event) => setStreetAddress(event.target.value)}
            className="input"
          />
          <input
            id="address-line2"
            name="apartment"
            type="text"
            placeholder="Apartment, suite, or landmark"
            value={apartment}
            onChange={(event) => setApartment(event.target.value)}
            className="input"
          />
          <div className="grid gap-3 sm:grid-cols-3">
            <input
              id="address-city"
              name="city"
              type="text"
              required
              placeholder="City / district"
              value={city}
              onChange={(event) => setCity(event.target.value)}
              className="input"
            />
            <select
              id="address-state"
              name="state"
              value={state}
              onChange={(event) => setState(event.target.value)}
              className="input cursor-pointer"
            >
              {INDIAN_STATES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
            <input
              id="address-pincode"
              name="pincode"
              type="text"
              required
              placeholder="Pincode"
              value={pincode}
              onChange={(event) => setPincode(event.target.value)}
              className="input"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" className="button-primary text-xs">
              Save address
            </button>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="button-secondary text-xs"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </section>
  )
}

export default AddressSelector
