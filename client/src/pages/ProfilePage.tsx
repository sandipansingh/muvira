import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Bell, LogOut, MapPin, Package, Pencil, Trash2, User } from 'lucide-react'
import type { Address } from '../lib/types/cart'
import { addressService } from '../lib/services/address.service'
import { notificationService } from '../lib/services/notification.service'
import { INDIAN_STATES } from '../lib/constants/states.constants'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { Select } from '../components/ui/Select'
import { Breadcrumbs } from '../components/common/Breadcrumbs'

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
  const [emailNotificationsEnabled, setEmailNotificationsEnabled] = useState(true)
  const [loadingPreferences, setLoadingPreferences] = useState(true)
  const [savingPreferences, setSavingPreferences] = useState(false)
  const [preferencesError, setPreferencesError] = useState<string | null>(null)

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

  useEffect(() => {
    if (!user) return
    let active = true
    const loadPreferences = async () => {
      setLoadingPreferences(true)
      setPreferencesError(null)
      try {
        const response = await notificationService.getPreferences()
        if (!response.success) throw new Error(response.error.message)
        if (active) setEmailNotificationsEnabled(response.data.emailEnabled)
      } catch (reason) {
        if (active) {
          setPreferencesError(
            reason instanceof Error ? reason.message : 'Unable to load notification preferences.'
          )
        }
      } finally {
        if (active) setLoadingPreferences(false)
      }
    }
    void loadPreferences()
    return () => {
      active = false
    }
  }, [user])

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

  const updateEmailPreference = async (enabled: boolean) => {
    setSavingPreferences(true)
    setPreferencesError(null)
    try {
      const response = await notificationService.updatePreferences(enabled)
      if (!response.success) throw new Error(response.error.message)
      setEmailNotificationsEnabled(response.data.emailEnabled)
      showToast('Email notification preference updated.', 'success')
    } catch (reason) {
      const message =
        reason instanceof Error ? reason.message : 'Unable to update notification preference.'
      setPreferencesError(message)
      showToast(message, 'error')
    } finally {
      setSavingPreferences(false)
    }
  }

  if (authLoading || !user) return <main className="editorial-page" />

  return (
    <main className="editorial-page py-8 sm:py-10">
      <div className="editorial-container max-w-5xl space-y-8">
        <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'My Profile' }]} />
        <div className="flex items-center justify-between border-b border-[var(--color-line)] pb-4">
          <div>
            <span className="eyebrow mb-1 block">Account Overview</span>
            <h1 className="heading page-title">My Profile</h1>
          </div>
          <button type="button" onClick={logout} className="button-secondary px-4 py-2 text-xs">
            <LogOut className="h-4 w-4 shrink-0" />
            <span className="leading-none">Sign out</span>
          </button>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="space-y-2">
            <Link
              to="/profile"
              className="flex items-center gap-3 rounded-[var(--radius-control)] bg-[var(--color-ink)] p-4 text-xs font-normal text-white"
            >
              <User className="h-4 w-4 shrink-0" />
              <span className="leading-none">Personal Info</span>
            </Link>
            <Link
              to="/orders"
              className="flex items-center gap-3 rounded-[var(--radius-control)] border border-[var(--color-line)] p-4 text-xs font-normal text-[var(--color-muted)] transition-colors hover:bg-[var(--color-surface)] hover:text-[var(--color-ink)]"
            >
              <Package className="h-4 w-4 shrink-0" />
              <span className="leading-none">My Orders</span>
            </Link>
            <a
              href="#addresses"
              className="flex items-center gap-3 rounded-[var(--radius-control)] border border-[var(--color-line)] p-4 text-xs font-normal text-[var(--color-muted)] transition-colors hover:bg-[var(--color-surface)] hover:text-[var(--color-ink)]"
            >
              <MapPin className="h-4 w-4 shrink-0" />
              <span className="leading-none">Saved Addresses ({addresses.length})</span>
            </a>
          </div>

          <div className="space-y-6 md:col-span-2">
            <div className="panel space-y-5 p-5 sm:p-6">
              <h2 className="font-display text-lg font-bold text-[var(--color-ink)]">
                Personal Details
              </h2>
              <form onSubmit={handleProfileUpdate} className="space-y-4">
                <div>
                  <label
                    htmlFor="profile-email"
                    className="mb-1.5 block text-xs font-normal text-ink"
                  >
                    Email
                  </label>
                  <input
                    id="profile-email"
                    name="email"
                    type="email"
                    disabled
                    value={user.email}
                    className="input cursor-not-allowed bg-surface text-muted"
                  />
                </div>
                <div>
                  <label
                    htmlFor="profile-full-name"
                    className="mb-1.5 block text-xs font-normal text-ink"
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
                    className="input"
                  />
                </div>
                <div>
                  <label
                    htmlFor="profile-phone"
                    className="mb-1.5 block text-xs font-normal text-ink"
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
                    className="input"
                  />
                </div>
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="button-primary text-xs py-2.5 disabled:opacity-50"
                >
                  {savingProfile ? 'Saving...' : 'Save Changes'}
                </button>
              </form>
            </div>

            <section className="panel space-y-4 p-5 sm:p-6">
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-muted" />
                <h2 className="font-display text-lg font-bold text-ink">
                  Notification preferences
                </h2>
              </div>
              {loadingPreferences ? (
                <div className="h-16 animate-pulse rounded-xl bg-surface" aria-busy="true" />
              ) : (
                <label className="flex items-center justify-between gap-4 rounded-xl border border-line p-4">
                  <span>
                    <span className="block text-sm font-bold text-ink">Order update emails</span>
                    <span className="mt-1 block text-sm text-ink-soft">
                      Receive payment and fulfillment updates by email.
                    </span>
                  </span>
                  <input
                    type="checkbox"
                    checked={emailNotificationsEnabled}
                    disabled={savingPreferences || Boolean(preferencesError)}
                    onChange={(event) => void updateEmailPreference(event.target.checked)}
                    className="h-5 w-5 shrink-0 accent-primary"
                    aria-label="Receive order update emails"
                  />
                </label>
              )}
              {preferencesError && (
                <p className="rounded-lg border border-danger/30 bg-danger-soft p-3 text-sm text-danger">
                  {preferencesError}
                </p>
              )}
            </section>

            <section id="addresses" className="panel space-y-4 p-5 sm:p-6">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-xl font-bold text-[var(--color-ink)]">
                  Saved Addresses
                </h2>
                <button
                  type="button"
                  onClick={openNewAddressForm}
                  className="button-primary text-xs py-2 px-4"
                >
                  Add Address
                </button>
              </div>

              {addressFormOpen && (
                <form onSubmit={handleAddressSave} className="soft-panel mt-4 space-y-3 p-5">
                  <h3 className="font-sans text-xs font-bold uppercase tracking-wider text-ink">
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
                        className="input"
                      />
                    ))}
                    <Select
                      id="address-state"
                      name="state"
                      value={addressForm.state}
                      onChange={(event) =>
                        setAddressForm((previous) => ({ ...previous, state: event.target.value }))
                      }
                      options={INDIAN_STATES}
                    />
                  </div>
                  <label className="flex items-center gap-2 text-xs font-normal text-ink-soft">
                    <input
                      type="checkbox"
                      checked={addressForm.isDefault}
                      onChange={(event) =>
                        setAddressForm((previous) => ({
                          ...previous,
                          isDefault: event.target.checked,
                        }))
                      }
                      className="rounded accent-ink"
                    />
                    Use as default address
                  </label>
                  <div className="flex gap-2 pt-2">
                    <button type="submit" className="button-primary text-xs py-2.5">
                      Save address
                    </button>
                    <button
                      type="button"
                      onClick={() => setAddressFormOpen(false)}
                      className="button-secondary text-xs py-2.5"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              {loadingAddresses && (
                <div className="h-24 animate-pulse rounded-[var(--radius-control)] bg-[var(--color-surface)]" />
              )}
              {!loadingAddresses && addresses.length === 0 && (
                <p className="border-y border-line py-5 text-sm text-muted">
                  No saved addresses yet.
                </p>
              )}
              {!loadingAddresses &&
                addresses.map((address) => (
                  <div
                    key={address.id}
                    className="flex flex-col gap-4 rounded-[var(--radius-control)] border border-[var(--color-line)] bg-[var(--color-paper)] p-4 sm:flex-row sm:items-start sm:justify-between"
                  >
                    <div className="space-y-1 text-xs text-muted">
                      <div className="flex items-center gap-2">
                        <strong className="text-sm text-ink">{address.fullName}</strong>
                        {address.isDefault && <span className="status-badge">Default</span>}
                      </div>
                      <p className="text-ink-soft font-normal">
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
                          className="text-xs font-normal text-muted hover:text-primary hover:underline transition-colors cursor-pointer"
                        >
                          Set default
                        </button>
                      )}
                      <button
                        onClick={() => openEditAddressForm(address)}
                        aria-label="Edit address"
                        className="rounded-[var(--radius-control)] border border-line p-2 text-muted hover:bg-surface hover:text-ink cursor-pointer transition-colors"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => deleteAddress(address.id)}
                        aria-label="Delete address"
                        className="rounded-[var(--radius-control)] border border-line p-2 text-muted hover:bg-danger-soft hover:text-danger cursor-pointer transition-colors"
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
