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

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!fullName || !streetAddress || !city || !pincode || !phone) return

    onAddNewAddress({
      fullName,
      label: 'Home',
      streetAddress,
      apartment,
      city,
      state,
      pincode,
      phone,
      isDefault: addresses.length === 0,
    })

    setShowAddForm(false)
    setFullName('')
    setStreetAddress('')
    setApartment('')
    setCity('')
    setPincode('')
    setPhone('')
  }

  return (
    <div className="bg-[#F6F4EF] p-6 rounded-2xl border border-zinc-200/80 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-serif text-lg font-bold text-zinc-900">Delivery Address</h4>
        <button
          type="button"
          onClick={() => setShowAddForm(!showAddForm)}
          className="text-xs font-semibold text-[#C88D35] hover:underline flex items-center gap-1"
        >
          <Plus className="w-3.5 h-3.5" /> Add New Address
        </button>
      </div>

      {/* Address Cards List */}
      <div className="space-y-3">
        {addresses.map((addr) => (
          <label
            key={addr.id}
            className={`flex items-start gap-3 p-4 rounded-xl border transition-all cursor-pointer ${
              selectedAddressId === addr.id
                ? 'bg-white border-[#C88D35] shadow-xs ring-1 ring-[#C88D35]/20'
                : 'bg-white/60 border-zinc-200 hover:bg-white'
            }`}
          >
            <input
              type="radio"
              name="deliveryAddress"
              checked={selectedAddressId === addr.id}
              onChange={() => onSelectAddressId(addr.id)}
              className="mt-1 accent-[#C88D35]"
            />
            <div className="flex-1 text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-zinc-900 text-sm">
                  {addr.fullName} — {addr.label}
                </span>
                {addr.isDefault && (
                  <span className="px-2 py-0.5 bg-amber-100 text-amber-900 font-bold rounded-md text-[10px] uppercase">
                    Default
                  </span>
                )}
              </div>
              <p className="text-zinc-600">
                {addr.streetAddress} {addr.apartment ? `, ${addr.apartment}` : ''}
              </p>
              <p className="text-zinc-600">
                {addr.city}, {addr.state} {addr.pincode} — ({addr.phone})
              </p>
            </div>
          </label>
        ))}
      </div>

      {/* Add New Address Form Modal/Panel */}
      {showAddForm && (
        <form
          onSubmit={handleFormSubmit}
          className="mt-4 p-5 bg-white rounded-xl border border-zinc-300 space-y-3 animate-fadeIn"
        >
          <h5 className="font-semibold text-xs text-zinc-900 uppercase tracking-wider">
            Enter Shipping Details
          </h5>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              required
              placeholder="Full Name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="bg-[#F6F4EF] border border-zinc-300 rounded-xl px-4 py-2.5 text-base text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#C88D35]"
            />
            <input
              type="tel"
              required
              placeholder="Phone Number (10 digits)"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="bg-[#F6F4EF] border border-zinc-300 rounded-xl px-4 py-2.5 text-base text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#C88D35]"
            />
          </div>

          <input
            type="text"
            required
            placeholder="Street address (House No, Building, Area)"
            value={streetAddress}
            onChange={(e) => setStreetAddress(e.target.value)}
            className="w-full bg-[#F6F4EF] border border-zinc-300 rounded-xl px-4 py-2.5 text-base text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#C88D35]"
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              type="text"
              required
              placeholder="City / District"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="bg-[#F6F4EF] border border-zinc-300 rounded-xl px-4 py-2.5 text-base text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#C88D35]"
            />
            <select
              value={state}
              onChange={(e) => setState(e.target.value)}
              className="bg-[#F6F4EF] border border-zinc-300 rounded-xl px-4 py-2.5 text-base text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#C88D35]"
            >
              {INDIAN_STATES.map((st) => (
                <option key={st.value} value={st.value}>
                  {st.label}
                </option>
              ))}
            </select>
            <input
              type="text"
              required
              placeholder="Pincode (6 digits)"
              value={pincode}
              onChange={(e) => setPincode(e.target.value)}
              className="bg-[#F6F4EF] border border-zinc-300 rounded-xl px-4 py-2.5 text-base text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#C88D35]"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              className="px-5 py-2 bg-zinc-900 text-white font-semibold text-xs rounded-xl hover:bg-[#C88D35]"
            >
              Save Address
            </button>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 bg-zinc-100 text-zinc-600 font-semibold text-xs rounded-xl hover:bg-zinc-200"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
