import { CustomerPageHeading } from '../components/common/CustomerPageHeading'
import { AccountNavigation } from '../components/auth/AccountNavigation'
import { AccountOptions } from '../components/auth/AccountOptions'
import React, { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Pencil, Trash2 } from 'lucide-react'
import type { Address } from '../lib/types/cart'
import { addressService } from '../lib/services/address.service'
import { notificationService } from '../lib/services/notification.service'
import { INDIAN_STATES } from '../lib/constants/states.constants'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { Select } from '../components/ui/Select'
import { Button } from '../components/ui/Button'

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
  const { user, loading: authLoading, updateProfile } = useAuth()
  const { showToast } = useToast()
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const [addresses, setAddresses] = useState<Address[]>([])
  const [addressForm, setAddressForm] = useState<AddressFormValues>(emptyAddress)
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null)
  const [addressFormOpen, setAddressFormOpen] = useState(false)
  const [savingAddress, setSavingAddress] = useState(false)
  const [pendingAddressId, setPendingAddressId] = useState<string | null>(null)
  const addressPending = useRef(false)
  const [loadingAddresses, setLoadingAddresses] = useState(true)
  const [emailNotificationsEnabled, setEmailNotificationsEnabled] = useState(true)
  const [loadingPreferences, setLoadingPreferences] = useState(true)
  const [savingPreferences, setSavingPreferences] = useState(false)
  const [preferencesError, setPreferencesError] = useState<string | null>(null)
  const [preferencesLoaded, setPreferencesLoaded] = useState(false)
  const [preferencesRetry, setPreferencesRetry] = useState(0)

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
        if (active) {
          setEmailNotificationsEnabled(response.data.emailEnabled)
          setPreferencesLoaded(true)
        }
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
  }, [user, preferencesRetry])

  const handleProfileUpdate = async (event: React.FormEvent) => {
    event.preventDefault()
    setSavingProfile(true)
    try {
      await updateProfile(fullName, phone)
    } finally {
      setSavingProfile(false)
    }
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
    if (addressPending.current) return
    addressPending.current = true
    setSavingAddress(true)
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
    } finally {
      addressPending.current = false
      setSavingAddress(false)
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
    if (addressPending.current) return
    addressPending.current = true
    setPendingAddressId(id)
    let response
    try {
      response = await addressService.deleteAddress(id)
    } catch (reason) {
      showToast(reason instanceof Error ? reason.message : 'Unable to delete address.', 'error')
      return
    } finally {
      addressPending.current = false
      setPendingAddressId(null)
    }
    if (!response.success) {
      showToast(response.error.message, 'error')
      return
    }
    setAddresses((previous) => previous.filter((address) => address.id !== id))
    showToast('Address deleted.', 'info')
  }

  const setDefaultAddress = async (id: string) => {
    if (addressPending.current) return
    addressPending.current = true
    setPendingAddressId(id)
    let response
    try {
      response = await addressService.setDefaultAddress(id)
    } catch (reason) {
      showToast(
        reason instanceof Error ? reason.message : 'Unable to update default address.',
        'error'
      )
      return
    } finally {
      addressPending.current = false
      setPendingAddressId(null)
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
    <main className="account-page editorial-page py-10 sm:py-14">
      <div className="editorial-container max-w-6xl">
        <CustomerPageHeading
          title="Your account"
          actions={
            <>
              <Link to="/shop" className="account-shopping-link">
                Continue shopping
              </Link>
              <AccountOptions />
            </>
          }
        />
        <AccountNavigation addressCount={addresses.length} />

        <div className="account-workspace">
          <div>
            <section className="account-section space-y-5" aria-labelledby="personal-details-title">
              <h2 id="personal-details-title" className="font-sans text-lg font-semibold text-ink">
                Personal details
              </h2>
              <form
                onSubmit={handleProfileUpdate}
                className="grid grid-cols-1 gap-5 sm:grid-cols-2"
              >
                <div className="sm:col-span-2">
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
                    Full name
                  </label>
                  <input
                    id="profile-full-name"
                    name="fullName"
                    type="text"
                    autoComplete="name"
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
                    Phone number
                  </label>
                  <input
                    id="profile-phone"
                    name="phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel-national"
                    required
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    className="input"
                  />
                </div>
                <Button
                  type="submit"
                  isLoading={savingProfile}
                  className="justify-self-start sm:col-span-2"
                >
                  Save changes
                </Button>
              </form>
            </section>

            <section
              className="account-section space-y-4"
              aria-labelledby="notification-preferences-title"
            >
              <h2
                id="notification-preferences-title"
                className="font-sans text-lg font-semibold text-ink"
              >
                Notification preferences
              </h2>
              {loadingPreferences ? (
                <p role="status" className="py-4 text-sm text-muted">
                  Loading notification preferences…
                </p>
              ) : (
                <label className="flex min-h-[var(--tap-target)] items-center justify-between gap-4 py-2">
                  <span>
                    <span className="block text-sm font-bold text-ink">Order update emails</span>
                    <span className="mt-1 block text-sm text-ink-soft">
                      Receive payment and fulfillment updates by email.
                    </span>
                  </span>
                  <input
                    type="checkbox"
                    checked={emailNotificationsEnabled}
                    disabled={savingPreferences || !preferencesLoaded}
                    aria-busy={savingPreferences}
                    onChange={(event) => void updateEmailPreference(event.target.checked)}
                    className="h-5 w-5 shrink-0 accent-primary"
                    aria-label="Receive order update emails"
                  />
                </label>
              )}
              {preferencesError && (
                <p role="alert" className="text-sm text-danger">
                  {preferencesError}
                  {!preferencesLoaded && (
                    <Button
                      variant="secondary"
                      size="sm"
                      className="ml-3"
                      onClick={() => setPreferencesRetry((value) => value + 1)}
                    >
                      Try again
                    </Button>
                  )}
                </p>
              )}
            </section>

            <section
              id="addresses"
              className="account-section space-y-4"
              aria-labelledby="saved-addresses-title"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 id="saved-addresses-title" className="font-sans text-lg font-semibold text-ink">
                  Saved addresses
                </h2>
                <Button
                  type="button"
                  onClick={openNewAddressForm}
                  variant="secondary"
                  disabled={savingAddress || Boolean(pendingAddressId)}
                >
                  Add address
                </Button>
              </div>

              {addressFormOpen && (
                <form onSubmit={handleAddressSave} className="border-y border-line py-6 space-y-4">
                  <h3 className="font-sans text-base font-semibold text-ink">
                    {editingAddressId ? 'Edit address' : 'Add address'}
                  </h3>
                  <fieldset disabled={savingAddress} className="space-y-4">
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
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
                        <label
                          key={field}
                          htmlFor={`address-${field}`}
                          className="flex flex-col gap-1 text-sm text-ink"
                        >
                          <span>{label}</span>
                          <input
                            id={`address-${field}`}
                            name={field}
                            type={field === 'phone' ? 'tel' : 'text'}
                            inputMode={
                              field === 'pincode'
                                ? 'numeric'
                                : field === 'phone'
                                  ? 'tel'
                                  : undefined
                            }
                            autoComplete={
                              field === 'fullName'
                                ? 'name'
                                : field === 'phone'
                                  ? 'tel-national'
                                  : field === 'line1'
                                    ? 'address-line1'
                                    : field === 'line2'
                                      ? 'address-line2'
                                      : field === 'city'
                                        ? 'address-level2'
                                        : 'postal-code'
                            }
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
                        </label>
                      ))}
                      <div className="flex flex-col gap-1">
                        <label htmlFor="address-state" className="text-sm text-ink">
                          State
                        </label>
                        <Select
                          id="address-state"
                          name="state"
                          value={addressForm.state}
                          onChange={(event) =>
                            setAddressForm((previous) => ({
                              ...previous,
                              state: event.target.value,
                            }))
                          }
                          options={INDIAN_STATES}
                        />
                      </div>
                    </div>
                    <label className="flex min-h-[var(--tap-target)] items-center gap-2 text-base font-normal text-ink-soft">
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
                      <Button type="submit" isLoading={savingAddress}>
                        Save address
                      </Button>
                      <Button
                        type="button"
                        onClick={() => setAddressFormOpen(false)}
                        variant="secondary"
                      >
                        Cancel
                      </Button>
                    </div>
                  </fieldset>
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
                    className="account-address flex flex-col gap-4 border-t border-line py-5 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between"
                  >
                    <div className="min-w-0 space-y-1 text-base text-muted">
                      <div className="flex flex-wrap items-center gap-2">
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
                    <div className="flex flex-wrap items-center gap-2">
                      {!address.isDefault && (
                        <Button
                          onClick={() => setDefaultAddress(address.id)}
                          variant="ghost"
                          size="sm"
                          disabled={savingAddress || Boolean(pendingAddressId)}
                          isLoading={pendingAddressId === address.id}
                        >
                          Set default
                        </Button>
                      )}
                      <Button
                        variant="secondary"
                        size="icon"
                        onClick={() => openEditAddressForm(address)}
                        aria-label="Edit address"
                        disabled={savingAddress || Boolean(pendingAddressId)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="secondary"
                        size="icon"
                        onClick={() => deleteAddress(address.id)}
                        aria-label="Delete address"
                        disabled={savingAddress || Boolean(pendingAddressId)}
                        isLoading={pendingAddressId === address.id}
                        className="hover:bg-danger-soft hover:text-danger"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
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
