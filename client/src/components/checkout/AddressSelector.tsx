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
    <section className="border-b border-line pb-6">
      <div className="flex items-center justify-between gap-4">
        <h2 className="font-serif text-2xl font-bold text-ink">Delivery address</h2>
        <button
          type="button"
          onClick={() => setShowAddForm((open) => !open)}
          className="inline-flex items-center gap-1 text-xs font-semibold text-cognac hover:text-ink"
        >
          <Plus className="h-3.5 w-3.5" /> Add new
        </button>
      </div>
      <div className="mt-5 space-y-3">
        {addresses.length === 0 && (
          <p className="border border-line bg-ivory p-4 text-sm text-muted-ink">
            No saved addresses yet. Add one to continue.
          </p>
        )}
        {addresses.map((address) => (
          <label
            key={address.id}
            className={`flex cursor-pointer items-start gap-3 border p-4 transition-colors ${selectedAddressId === address.id ? 'border-cognac bg-ivory' : 'border-line bg-paper hover:bg-ivory'}`}
          >
            <input
              type="radio"
              name="delivery-address"
              checked={selectedAddressId === address.id}
              onChange={() => onSelectAddressId(address.id)}
              className="mt-1 accent-cognac"
            />
            <div className="flex-1 text-xs leading-5 text-muted-ink">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold text-ink">
                  {address.fullName} — {address.label}
                </span>
                {address.isDefault && (
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-cognac">
                    Default
                  </span>
                )}
              </div>
              <p>
                {address.streetAddress}
                {address.apartment ? `, ${address.apartment}` : ''}
              </p>
              <p>
                {address.city}, {address.state} {address.pincode} · {address.phone}
              </p>
            </div>
          </label>
        ))}
      </div>

      {showAddForm && (
        <form
          onSubmit={handleFormSubmit}
          className="mt-5 space-y-3 border border-line bg-ivory p-5"
        >
          <h3 className="text-xs font-semibold uppercase tracking-wide text-ink">
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
              className="editorial-input"
            />
            <input
              id="address-phone"
              name="phone"
              type="tel"
              required
              placeholder="Phone number"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              className="editorial-input"
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
            className="editorial-input"
          />
          <input
            id="address-line2"
            name="apartment"
            type="text"
            placeholder="Apartment, suite, or landmark"
            value={apartment}
            onChange={(event) => setApartment(event.target.value)}
            className="editorial-input"
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
              className="editorial-input"
            />
            <select
              id="address-state"
              name="state"
              value={state}
              onChange={(event) => setState(event.target.value)}
              className="editorial-input"
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
              className="editorial-input"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" className="editorial-button">
              Save address
            </button>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="editorial-button-secondary"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </section>
  )
}
