import { AccountShell } from '../components/auth/AccountShell'
import { AccountOverview } from '../components/auth/AccountOverview'
import type { Profile } from '../lib/types/auth'
import React, { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
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
  const { user, loading } = useAuth()
  if (loading || !user) return <main className="editorial-page" />
  return <AccountWorkspace key={user.id} user={user} />
}

function AccountWorkspace({ user }: { user: Profile }) {
  const { updateProfile } = useAuth()
  const { hash } = useLocation()
  const view =
    hash === '#addresses' ? 'addresses' : hash === '#personal-info' ? 'personal' : 'overview'
  const mounted = useRef(true)
  const profilePending = useRef(false)
  const preferencePending = useRef(false)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])
  const { showToast } = useToast()
  const [fullName, setFullName] = useState(user.fullName)
  const [phone, setPhone] = useState(user.phone)
  const [savingProfile, setSavingProfile] = useState(false)
  const [addresses, setAddresses] = useState<Address[]>([])
  const [addressForm, setAddressForm] = useState<AddressFormValues>(emptyAddress)
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null)
  const [addressFormOpen, setAddressFormOpen] = useState(false)
  const [savingAddress, setSavingAddress] = useState(false)
  const [pendingAddressId, setPendingAddressId] = useState<string | null>(null)
  const addressPending = useRef(false)
  const [loadingAddresses, setLoadingAddresses] = useState(true)
  const [addressError, setAddressError] = useState<string | null>(null)
  const [addressRetry, setAddressRetry] = useState(0)
  const [emailNotificationsEnabled, setEmailNotificationsEnabled] = useState(true)
  const [loadingPreferences, setLoadingPreferences] = useState(true)
  const [savingPreferences, setSavingPreferences] = useState(false)
  const [preferencesError, setPreferencesError] = useState<string | null>(null)
  const [preferencesLoaded, setPreferencesLoaded] = useState(false)
  const [preferencesRetry, setPreferencesRetry] = useState(0)

  useEffect(() => {
    let active = true
    const loadAddresses = async () => {
      setLoadingAddresses(true)
      setAddressError(null)
      try {
        const response = await addressService.getAddresses()
        if (!response.success) throw new Error(response.error.message)
        if (active) setAddresses(response.data)
      } catch (reason) {
        if (active)
          setAddressError(reason instanceof Error ? reason.message : 'Unable to load addresses.')
      } finally {
        if (active) setLoadingAddresses(false)
      }
    }
    void loadAddresses()
    return () => {
      active = false
    }
  }, [addressRetry])

  useEffect(() => {
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
  }, [preferencesRetry])

  const handleProfileUpdate = async (event: React.FormEvent) => {
    event.preventDefault()
    if (profilePending.current) return
    profilePending.current = true
    setSavingProfile(true)
    try {
      await updateProfile(fullName, phone)
    } finally {
      profilePending.current = false
      if (mounted.current) setSavingProfile(false)
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
      if (!mounted.current) return
      showToast(reason instanceof Error ? reason.message : 'Unable to save address.', 'error')
      return
    } finally {
      addressPending.current = false
      if (mounted.current) setSavingAddress(false)
    }

    if (!mounted.current) return
    if (!response.success) {
      showToast(response.error.message, 'error')
      return
    }
    setAddresses((previous) => {
      const reconciled = response.data.isDefault
        ? previous.map((address) => ({ ...address, isDefault: false }))
        : previous
      return editingAddressId
        ? reconciled.map((address) => (address.id === response.data.id ? response.data : address))
        : [...reconciled, response.data]
    })
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
      if (!mounted.current) return
      showToast(reason instanceof Error ? reason.message : 'Unable to delete address.', 'error')
      return
    } finally {
      addressPending.current = false
      if (mounted.current) setPendingAddressId(null)
    }
    if (!mounted.current) return
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
      if (!mounted.current) return
      showToast(
        reason instanceof Error ? reason.message : 'Unable to update default address.',
        'error'
      )
      return
    } finally {
      addressPending.current = false
      if (mounted.current) setPendingAddressId(null)
    }
    if (!mounted.current) return
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
    if (preferencePending.current) return
    preferencePending.current = true
    setSavingPreferences(true)
    setPreferencesError(null)
    try {
      const response = await notificationService.updatePreferences(enabled)
      if (!response.success) throw new Error(response.error.message)
      if (!mounted.current) return
      setEmailNotificationsEnabled(response.data.emailEnabled)
      showToast('Email notification preference updated.', 'success')
    } catch (reason) {
      if (!mounted.current) return
      const message =
        reason instanceof Error ? reason.message : 'Unable to update notification preference.'
      setPreferencesError(message)
      showToast(message, 'error')
    } finally {
      preferencePending.current = false
      if (mounted.current) setSavingPreferences(false)
    }
  }

  return (
    <AccountShell addressCount={loadingAddresses || addressError ? undefined : addresses.length}>
      {view === 'overview' && (
        <AccountOverview
          addresses={addresses}
          loadingAddresses={loadingAddresses}
          addressError={addressError}
          retryAddresses={() => setAddressRetry((value) => value + 1)}
        />
      )}
      <div className="account-workspace" hidden={view === 'overview'}>
        <div>
          <div hidden={view !== 'personal'} className="account-personal account-card">
            <section
              id="personal-info"
              className="account-section space-y-5"
              aria-labelledby="personal-details-title"
            >
              <h2
                id="personal-details-title"
                className="font-display text-2xl font-normal text-ink"
              >
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
                className="font-display text-2xl font-normal text-ink"
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
          </div>
          <section
            hidden={view !== 'addresses'}
            id="addresses"
            className="account-section account-card space-y-4"
            aria-labelledby="saved-addresses-title"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 id="saved-addresses-title" className="font-display text-2xl font-normal text-ink">
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
                            field === 'pincode' ? 'numeric' : field === 'phone' ? 'tel' : undefined
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
              <p role="status" className="py-6 text-sm text-ink-soft">
                Loading your addresses…
              </p>
            )}
            {!loadingAddresses && addressError && (
              <div>
                <p role="alert" className="text-sm text-danger">
                  {addressError}
                </p>
                <Button
                  variant="secondary"
                  className="mt-4"
                  onClick={() => setAddressRetry((value) => value + 1)}
                >
                  Try again
                </Button>
              </div>
            )}
            {!loadingAddresses && !addressError && addresses.length === 0 && (
              <p className="border-y border-line py-5 text-sm text-muted">
                No saved addresses yet.
              </p>
            )}
            {!loadingAddresses &&
              !addressError &&
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
    </AccountShell>
  )
}

export default ProfilePage
