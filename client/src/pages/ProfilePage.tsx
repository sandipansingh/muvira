import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { LogOut, MapPin, Package, Pencil, Trash2, User } from 'lucide-react'
import type { Address } from '../lib/types/cart'
import { addressService } from '../lib/services/address.service'
import { INDIAN_STATES } from '../lib/constants/states.constants'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

interface AddressFormValues {
  fullName: string
  phone: string
  line1: string
  line2: string
  city: string
  state: string
  pincode: string
  isDefault: boolean
}

const emptyAddress: AddressFormValues = {
  fullName: '',
  phone: '',
  line1: '',
  line2: '',
  city: '',
  state: 'West Bengal',
  pincode: '',
  isDefault: false,
}

function addressValues(address: Address): AddressFormValues {
  return {
    fullName: address.fullName,
    phone: address.phone,
    line1: address.line1,
    line2: address.line2 ?? '',
    city: address.city,
    state: address.state,
    pincode: address.pincode,
    isDefault: address.isDefault,
  }
}

export const ProfilePage: React.FC = () => {
  const { user, loading: authLoading, logout, updateProfile } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const [addresses, setAddresses] = useState<Address[]>([])
  const [addressForm, setAddressForm] = useState<AddressFormValues>(emptyAddress)
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null)
  const [addressFormOpen, setAddressFormOpen] = useState(false)
  const [loadingAddresses, setLoadingAddresses] = useState(true)

  useEffect(() => {
    if (!authLoading && !user) navigate('/signin?returnTo=/profile', { replace: true })
  }, [authLoading, navigate, user])

  useEffect(() => {
    if (user) {
      setFullName(user.fullName)
      setPhone(user.phone)
    }
  }, [user])

  useEffect(() => {
    if (!user) return
    let active = true
    const loadAddresses = async () => {
      setLoadingAddresses(true)
      try {
        const response = await addressService.getAddresses()
        if (response.success && active) setAddresses(response.data)
      } catch (reason) {
        if (active)
          showToast(reason instanceof Error ? reason.message : 'Unable to load addresses.', 'error')
      } finally {
        if (active) setLoadingAddresses(false)
      }
    }
    void loadAddresses()
    return () => {
      active = false
    }
  }, [showToast, user])

  const handleProfileUpdate = async (event: React.FormEvent) => {
    event.preventDefault()
    setSavingProfile(true)
    await updateProfile(fullName, phone)
    setSavingProfile(false)
  }

  const openNewAddressForm = () => {
    setEditingAddressId(null)
    setAddressForm({ ...emptyAddress, fullName: fullName || user?.fullName || '' })
    setAddressFormOpen(true)
  }

  const openEditAddressForm = (address: Address) => {
    setEditingAddressId(address.id)
    setAddressForm(addressValues(address))
    setAddressFormOpen(true)
  }

  const handleAddressSave = async (event: React.FormEvent) => {
    event.preventDefault()
    const data = {
      ...addressForm,
      line2: addressForm.line2 || null,
      country: 'India',
      label: 'Address',
    }
    let response
    try {
      response = editingAddressId
        ? await addressService.updateAddress(editingAddressId, data)
        : await addressService.createAddress(data)
    } catch (reason) {
      showToast(reason instanceof Error ? reason.message : 'Unable to save address.', 'error')
      return
    }

    if (!response.success) {
      showToast(response.error.message, 'error')
      return
    }
    setAddresses((previous) =>
      editingAddressId
        ? previous.map((address) => (address.id === response.data.id ? response.data : address))
        : [...previous, response.data]
    )
    setAddressFormOpen(false)
    showToast(editingAddressId ? 'Address updated.' : 'Address saved.', 'success')
  }

  const deleteAddress = async (id: string) => {
    let response
    try {
      response = await addressService.deleteAddress(id)
    } catch (reason) {
      showToast(reason instanceof Error ? reason.message : 'Unable to delete address.', 'error')
      return
    }
    if (!response.success) {
      showToast(response.error.message, 'error')
      return
    }
    setAddresses((previous) => previous.filter((address) => address.id !== id))
    showToast('Address deleted.', 'info')
  }

  const setDefaultAddress = async (id: string) => {
    let response
    try {
      response = await addressService.setDefaultAddress(id)
    } catch (reason) {
      showToast(
        reason instanceof Error ? reason.message : 'Unable to update default address.',
        'error'
      )
      return
    }
    if (!response.success) {
      showToast(response.error.message, 'error')
      return
    }
    setAddresses((previous) =>
      previous.map((address) => ({ ...address, isDefault: address.id === response.data.id }))
    )
    showToast('Default address updated.', 'success')
  }

  if (authLoading || !user) return <main className="editorial-page" />

  return (
    <main className="editorial-page py-10 sm:py-16">
      <div className="editorial-container max-w-5xl space-y-10">
        <div className="flex items-center justify-between border-b border-[var(--kit-line)] pb-6">
          <div>
            <span className="kit-eyebrow mb-1 block">Account Overview</span>
            <h1 className="kit-heading text-4xl sm:text-6xl">My Profile</h1>
          </div>
          <button
            type="button"
            onClick={logout}
            className="editorial-button-secondary px-4 py-2 text-xs font-bold"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            <span className="leading-none">Sign out</span>
          </button>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          <div className="space-y-2">
            <Link
              to="/profile"
              className="flex items-center gap-3 rounded-[var(--kit-radius-control)] bg-[var(--kit-ink)] p-4 text-xs font-bold text-white"
            >
              <User className="h-4 w-4 shrink-0" />
              <span className="leading-none">Personal Info</span>
            </Link>
            <Link
              to="/orders"
              className="flex items-center gap-3 rounded-[var(--kit-radius-control)] border border-[var(--kit-line)] p-4 text-xs font-bold text-[var(--kit-muted)] transition-colors hover:bg-[var(--kit-surface)] hover:text-[var(--kit-ink)]"
            >
              <Package className="h-4 w-4 shrink-0" />
              <span className="leading-none">My Orders</span>
            </Link>
            <a
              href="#addresses"
              className="flex items-center gap-3 rounded-[var(--kit-radius-control)] border border-[var(--kit-line)] p-4 text-xs font-bold text-[var(--kit-muted)] transition-colors hover:bg-[var(--kit-surface)] hover:text-[var(--kit-ink)]"
            >
              <MapPin className="h-4 w-4 shrink-0" />
              <span className="leading-none">Saved Addresses ({addresses.length})</span>
            </a>
          </div>

          <div className="space-y-8 md:col-span-2">
            <div className="kit-panel space-y-6 p-6 sm:p-8">
              <h2 className="font-display text-xl font-bold text-[var(--kit-ink)]">
                Personal Details
              </h2>
              <form onSubmit={handleProfileUpdate} className="space-y-4">
                <div>
                  <label
                    htmlFor="profile-email"
                    className="mb-1.5 block text-xs font-bold text-foreground"
                  >
                    Email
                  </label>
                  <input
                    id="profile-email"
                    name="email"
                    type="email"
                    disabled
                    value={user.email}
                    className="editorial-input cursor-not-allowed bg-neutral-100 text-neutral-500"
                  />
                </div>
                <div>
                  <label
                    htmlFor="profile-full-name"
                    className="mb-1.5 block text-xs font-bold text-foreground"
                  >
                    Full Name
                  </label>
                  <input
                    id="profile-full-name"
                    name="fullName"
                    type="text"
                    required
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    className="editorial-input"
                  />
                </div>
                <div>
                  <label
                    htmlFor="profile-phone"
                    className="mb-1.5 block text-xs font-bold text-foreground"
                  >
                    Phone Number
                  </label>
                  <input
                    id="profile-phone"
                    name="phone"
                    type="tel"
                    required
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    className="editorial-input"
                  />
                </div>
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="editorial-button text-xs py-2.5 font-bold disabled:opacity-50"
                >
                  {savingProfile ? 'Saving...' : 'Save Changes'}
                </button>
              </form>
            </div>

            <section id="addresses" className="kit-panel space-y-4 p-6 sm:p-8">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-xl font-bold text-[var(--kit-ink)]">
                  Saved Addresses
                </h2>
                <button
                  type="button"
                  onClick={openNewAddressForm}
                  className="editorial-button text-xs py-2 px-4 font-bold"
                >
                  Add Address
                </button>
              </div>

              {addressFormOpen && (
                <form onSubmit={handleAddressSave} className="kit-soft-panel mt-4 space-y-3 p-5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                    {editingAddressId ? 'Edit Address' : 'Add Address'}
                  </h3>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {(
                      [
                        ['fullName', 'Full name'],
                        ['phone', 'Phone number'],
                        ['line1', 'Address line 1'],
                        ['line2', 'Address line 2 (optional)'],
                        ['city', 'City'],
                        ['pincode', 'Pincode'],
                      ] as const
                    ).map(([field, label]) => (
                      <input
                        key={field}
                        id={`address-${field}`}
                        name={field}
                        type="text"
                        required={!['line2'].includes(field)}
                        placeholder={label}
                        value={addressForm[field]}
                        onChange={(event) =>
                          setAddressForm((previous) => ({
                            ...previous,
                            [field]: event.target.value,
                          }))
                        }
                        className="editorial-input"
                      />
                    ))}
                    <select
                      id="address-state"
                      name="state"
                      value={addressForm.state}
                      onChange={(event) =>
                        setAddressForm((previous) => ({ ...previous, state: event.target.value }))
                      }
                      className="editorial-input cursor-pointer"
                    >
                      {INDIAN_STATES.map((state) => (
                        <option key={state.value} value={state.value}>
                          {state.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <label className="flex items-center gap-2 text-xs font-semibold text-neutral-700">
                    <input
                      type="checkbox"
                      checked={addressForm.isDefault}
                      onChange={(event) =>
                        setAddressForm((previous) => ({
                          ...previous,
                          isDefault: event.target.checked,
                        }))
                      }
                      className="rounded accent-neutral-900"
                    />
                    Use as default address
                  </label>
                  <div className="flex gap-2 pt-2">
                    <button type="submit" className="editorial-button text-xs py-2.5 font-bold">
                      Save address
                    </button>
                    <button
                      type="button"
                      onClick={() => setAddressFormOpen(false)}
                      className="editorial-button-secondary text-xs py-2.5 font-bold"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              {loadingAddresses && (
                <div className="h-24 animate-pulse rounded-[var(--kit-radius-control)] bg-[var(--kit-surface)]" />
              )}
              {!loadingAddresses && addresses.length === 0 && (
                <p className="border-y border-border-light py-5 text-sm text-neutral-500">
                  No saved addresses yet.
                </p>
              )}
              {!loadingAddresses &&
                addresses.map((address) => (
                  <div
                    key={address.id}
                    className="flex flex-col gap-4 rounded-[var(--kit-radius-control)] border border-[var(--kit-line)] bg-[var(--kit-paper)] p-4 sm:flex-row sm:items-start sm:justify-between"
                  >
                    <div className="space-y-1 text-xs text-neutral-500">
                      <div className="flex items-center gap-2">
                        <strong className="text-sm font-bold text-foreground">
                          {address.fullName}
                        </strong>
                        {address.isDefault && <span className="kit-status-badge">Default</span>}
                      </div>
                      <p className="text-neutral-700 font-medium">
                        {address.line1}
                        {address.line2 ? `, ${address.line2}` : ''}
                      </p>
                      <p>
                        {address.city}, {address.state} {address.pincode}
                      </p>
                      <p>{address.phone}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {!address.isDefault && (
                        <button
                          onClick={() => setDefaultAddress(address.id)}
                          className="text-xs font-bold text-neutral-500 hover:text-brand transition-colors cursor-pointer"
                        >
                          Set default
                        </button>
                      )}
                      <button
                        onClick={() => openEditAddressForm(address)}
                        aria-label="Edit address"
                        className="rounded-full border border-border-light p-2 text-neutral-500 hover:bg-neutral-50 hover:text-foreground cursor-pointer transition-colors"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => deleteAddress(address.id)}
                        aria-label="Delete address"
                        className="rounded-full border border-border-light p-2 text-neutral-500 hover:bg-red-50 hover:text-red-600 cursor-pointer transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
            </section>
          </div>
        </div>
      </div>
    </main>
  )
}

export default ProfilePage
