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
    if (!authLoading && !user) navigate('/login?returnTo=/profile', { replace: true })
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
    <main className="editorial-page py-12 sm:py-16">
      <div className="editorial-container max-w-5xl space-y-10">
        <div className="flex items-center justify-between border-b border-line pb-6">
          <div>
            <span className="editorial-label">Account overview</span>
            <h1 className="editorial-heading mt-3 text-4xl sm:text-5xl">My profile</h1>
          </div>
          <button type="button" onClick={logout} className="editorial-button-secondary px-4">
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          <div className="space-y-2">
            <Link
              to="/profile"
              className="flex items-center gap-3 border-b-2 border-ink bg-surface p-4 text-xs font-bold text-ink"
            >
              <User className="h-4 w-4 text-ink" /> Personal info
            </Link>
            <Link
              to="/orders"
              className="flex items-center gap-3 border-b border-line p-4 text-xs font-medium text-muted-ink transition-colors duration-control hover:bg-surface"
            >
              <Package className="h-4 w-4" /> My orders
            </Link>
            <a
              href="#addresses"
              className="flex items-center gap-3 border-b border-line p-4 text-xs font-medium text-muted-ink transition-colors duration-control hover:bg-surface"
            >
              <MapPin className="h-4 w-4" /> Saved addresses ({addresses.length})
            </a>
          </div>

          <div className="space-y-8 md:col-span-2">
            <div className="space-y-6 border-y border-line py-6 sm:py-8">
              <h2 className="font-serif text-2xl font-bold text-ink">Personal details</h2>
              <form onSubmit={handleProfileUpdate} className="space-y-4">
                <div>
                  <label
                    htmlFor="profile-email"
                    className="mb-2 block text-xs font-semibold text-ink"
                  >
                    Email
                  </label>
                  <input
                    id="profile-email"
                    name="email"
                    type="email"
                    disabled
                    value={user.email}
                    className="editorial-input cursor-not-allowed bg-surface text-muted-ink"
                  />
                </div>
                <div>
                  <label
                    htmlFor="profile-full-name"
                    className="mb-2 block text-xs font-semibold text-ink"
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
                    className="mb-2 block text-xs font-semibold text-ink"
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
                  className="editorial-button disabled:opacity-50"
                >
                  {savingProfile ? 'Saving...' : 'Save Changes'}
                </button>
              </form>
            </div>

            <section id="addresses" className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-serif text-2xl font-bold text-ink">Saved addresses</h2>
                <button type="button" onClick={openNewAddressForm} className="editorial-button">
                  Add address
                </button>
              </div>

              {addressFormOpen && (
                <form onSubmit={handleAddressSave} className="space-y-3 border-t border-line pt-5">
                  <h3 className="text-sm font-bold text-ink">
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
                      className="editorial-input"
                    >
                      {INDIAN_STATES.map((state) => (
                        <option key={state.value} value={state.value}>
                          {state.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <label className="flex items-center gap-2 text-xs text-ink">
                    <input
                      type="checkbox"
                      checked={addressForm.isDefault}
                      onChange={(event) =>
                        setAddressForm((previous) => ({
                          ...previous,
                          isDefault: event.target.checked,
                        }))
                      }
                    />
                    Use as default address
                  </label>
                  <div className="flex gap-2">
                    <button type="submit" className="editorial-button">
                      Save address
                    </button>
                    <button
                      type="button"
                      onClick={() => setAddressFormOpen(false)}
                      className="editorial-button-secondary"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              {loadingAddresses && <div className="h-24 animate-pulse bg-surface" />}
              {!loadingAddresses && addresses.length === 0 && (
                <p className="border-y border-line py-5 text-sm text-muted-ink">
                  No saved addresses yet.
                </p>
              )}
              {!loadingAddresses &&
                addresses.map((address) => (
                  <div
                    key={address.id}
                    className="flex flex-col gap-4 border-b border-line py-5 sm:flex-row sm:items-start sm:justify-between"
                  >
                    <div className="space-y-1 text-xs text-muted-ink">
                      <div className="flex items-center gap-2">
                        <strong className="text-sm text-ink">{address.fullName}</strong>
                        {address.isDefault && (
                          <span className="text-[10px] font-bold uppercase tracking-wide text-muted-ink">
                            Default
                          </span>
                        )}
                      </div>
                      <p>
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
                          className="text-xs font-semibold text-muted-ink transition-colors duration-control hover:text-terracotta"
                        >
                          Set default
                        </button>
                      )}
                      <button
                        onClick={() => openEditAddressForm(address)}
                        aria-label="Edit address"
                        className="rounded-control border border-line p-2 text-muted-ink transition-colors duration-control hover:bg-surface hover:text-ink"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => deleteAddress(address.id)}
                        aria-label="Delete address"
                        className="rounded-control border border-line p-2 text-muted-ink transition-colors duration-control hover:bg-danger-soft hover:text-danger"
                      >
                        <Trash2 className="h-4 w-4" />
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
