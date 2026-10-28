import React, { useEffect, useState } from 'react'
import { AdminPageHeader, AdminState } from '../../components/admin/AdminWorkspace'
import { useToast } from '../../context/ToastContext'
import { settingsService } from '../../lib/services/settings.service'
import type { SiteSettings } from '../../lib/types/settings'
import { useSiteSettings } from '../../context/SiteSettingsContext'
import { adminApiService } from '../../lib/services/admin/admin.service'
import { Dropdown } from '../../components/ui/Dropdown'
import { AdminContentEditor } from '../../components/admin/AdminContentEditor'

export const AdminSettingsPage: React.FC = () => {
  const { showToast } = useToast()
  const { applySettings } = useSiteSettings()
  const [pickupLocation, setPickupLocation] = useState('')
  const [pickupOptions, setPickupOptions] = useState<Array<{ value: string; label: string }>>([])
  const [pickupError, setPickupError] = useState<string | null>(null)

  const loadPickupLocations = async () => {
    setPickupError(null)
    try {
      const response = await adminApiService.getPickupLocations()
      if (!response.success) throw new Error(response.error.message)
      setPickupOptions(
        response.data.map((location) => ({
          value: location.pickup_location,
          label: `${location.pickup_location} — ${location.city} ${location.pincode}`,
        }))
      )
    } catch (reason) {
      setPickupError(
        reason instanceof Error ? reason.message : 'Pickup locations could not be loaded.'
      )
    }
  }
  const [settings, setSettings] = useState<SiteSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)
    void settingsService
      .getSettings()
      .then((response) => {
        if (!active) return
        if (!response.success) throw new Error(response.error.message)
        setSettings(response.data)
        setPickupLocation(response.data.shiprocketSettings.pickupLocation)
      })
      .catch((reason) => {
        if (active) setError(reason instanceof Error ? reason.message : 'Settings are unavailable.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [revision])

  useEffect(() => {
    void loadPickupLocations()
  }, [])

  const saveSettings = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!settings || saving) return
    const form = new FormData(event.currentTarget)
    setSaving(true)
    setError(null)
    try {
      const response = await settingsService.adminUpdateSettings({
        contact_info: {
          email: String(form.get('email')),
          phone: String(form.get('phone')),
          address: String(form.get('address')),
        },
        announcement_bar: {
          enabled: form.get('announcementEnabled') === 'on',
          badge: String(form.get('announcementBadge') ?? ''),
          message: String(form.get('announcementMessage') ?? ''),
        },
        shipping_methods: {
          standard: {
            enabled: true,
            label: settings.shippingMethods?.standard.label ?? 'Standard Shipping',
            description: settings.shippingMethods?.standard.description ?? '5–7 business days',
            charge_paisa: 0,
            free_threshold_paisa: 0,
          },
          express: {
            enabled: true,
            label: settings.shippingMethods?.express.label ?? 'Express Shipping',
            description: settings.shippingMethods?.express.description ?? '1–2 business days',
            charge_paisa: 0,
            free_threshold_paisa: 0,
          },
        },
        shiprocket_settings: {
          pickup_location: pickupLocation,
          default_length_cm: Number(form.get('length')),
          default_breadth_cm: Number(form.get('breadth')),
          default_height_cm: Number(form.get('height')),
          default_weight_grams: Number(form.get('weight')),
        },
      })
      if (!response.success) throw new Error(response.error.message)
      setSettings(response.data)
      applySettings(response.data)
      showToast('Settings saved.', 'success')
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : 'Settings could not be saved.'
      setError(message)
      showToast(message, 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading || !settings)
    return (
      <div className="space-y-6">
        <AdminPageHeader
          title="Store settings"
          description="Manage contact details, storefront content and fulfillment defaults."
        />
        <AdminState
          loading={loading}
          error={error}
          onRetry={() => setRevision((value) => value + 1)}
        />
      </div>
    )

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Store settings"
        description="Manage contact details, storefront content and fulfillment defaults."
      />
      <nav className="admin-settings-nav" aria-label="Settings sections">
        <a href="#settings-contact">Contact</a>
        <a href="#settings-announcement">Announcement</a>
        <a href="#settings-shipping">Shipping &amp; fulfillment</a>
        <a href="#settings-homepage">Homepage content</a>
      </nav>
      {error && <p className="rounded-card bg-danger-soft p-4 text-sm text-danger">{error}</p>}
      <form onSubmit={saveSettings} className="space-y-6">
        <section
          id="settings-contact"
          className="admin-settings-section panel grid gap-4 p-5 sm:grid-cols-2"
        >
          <h3 className="heading text-xl sm:col-span-2">Contact</h3>
          <label className="text-sm text-ink">
            Email
            <input
              name="email"
              type="email"
              required
              defaultValue={settings.contactInfo.email}
              className="mt-1 w-full rounded-xl border border-line px-4 py-2 text-base"
            />
          </label>
          <label className="text-sm text-ink">
            Phone
            <input
              name="phone"
              required
              defaultValue={settings.contactInfo.phone}
              className="mt-1 w-full rounded-xl border border-line px-4 py-2 text-base"
            />
          </label>
          <label className="text-sm text-ink sm:col-span-2">
            Address
            <textarea
              name="address"
              required
              defaultValue={settings.contactInfo.address}
              className="mt-1 min-h-24 w-full rounded-xl border border-line px-4 py-2 text-base"
            />
          </label>
        </section>
        <section
          id="settings-announcement"
          className="admin-settings-section panel grid gap-4 p-5 sm:grid-cols-2"
        >
          <h3 className="heading text-xl sm:col-span-2">Announcement</h3>
          <label className="flex items-center gap-2 text-sm text-ink">
            <input
              name="announcementEnabled"
              type="checkbox"
              defaultChecked={settings.announcementBar.enabled}
              className="h-5 w-5 accent-primary"
            />{' '}
            Enabled
          </label>
          <label className="text-sm text-ink">
            Badge
            <input
              name="announcementBadge"
              defaultValue={settings.announcementBar.badge}
              className="mt-1 w-full rounded-xl border border-line px-4 py-2 text-base"
            />
          </label>
          <label className="text-sm text-ink sm:col-span-2">
            Message
            <input
              name="announcementMessage"
              required
              defaultValue={settings.announcementBar.message}
              className="mt-1 w-full rounded-xl border border-line px-4 py-2 text-base"
            />
          </label>
        </section>
        <section
          id="settings-shipping"
          className="admin-settings-section panel grid gap-4 p-5 sm:grid-cols-2"
        >
          <h3 className="heading text-xl sm:col-span-2">Free shipping</h3>
          <p className="text-ink sm:col-span-2">
            Standard and express shipping are free on every new order, with no minimum spend.
          </p>
        </section>
        <section className="panel grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-5">
          <h3 className="heading text-xl sm:col-span-2 lg:col-span-5">Shiprocket defaults</h3>
          <div className="sm:col-span-2 lg:col-span-5">
            {!settings.configuration.fulfillment_ready && (
              <p className="mb-3 text-warning">
                Complete setup by selecting a registered pickup location and saving package
                defaults.
              </p>
            )}
            <Dropdown
              label="Registered pickup location"
              value={pickupLocation}
              onChange={setPickupLocation}
              options={pickupOptions}
              placeholder="Select pickup location"
            />
            {pickupError && (
              <p role="alert" className="mt-2 text-danger">
                {pickupError}
              </p>
            )}
            <button
              type="button"
              className="mt-2 text-primary"
              onClick={() => void loadPickupLocations()}
            >
              Refresh pickup locations
            </button>
          </div>
          <label className="text-sm text-ink">
            Length cm
            <input
              name="length"
              type="number"
              min="1"
              required
              defaultValue={settings.shiprocketSettings.defaultLengthCm}
              className="mt-1 w-full rounded-xl border border-line px-4 py-2 text-base"
            />
          </label>
          <label className="text-sm text-ink">
            Breadth cm
            <input
              name="breadth"
              type="number"
              min="1"
              required
              defaultValue={settings.shiprocketSettings.defaultBreadthCm}
              className="mt-1 w-full rounded-xl border border-line px-4 py-2 text-base"
            />
          </label>
          <label className="text-sm text-ink">
            Height cm
            <input
              name="height"
              type="number"
              min="1"
              required
              defaultValue={settings.shiprocketSettings.defaultHeightCm}
              className="mt-1 w-full rounded-xl border border-line px-4 py-2 text-base"
            />
          </label>
          <label className="text-sm text-ink">
            Weight g
            <input
              name="weight"
              type="number"
              min="1"
              required
              defaultValue={settings.shiprocketSettings.defaultWeightGrams}
              className="mt-1 w-full rounded-xl border border-line px-4 py-2 text-base"
            />
          </label>
        </section>
        <div className="admin-save-bar">
          <p className="text-sm text-muted">
            Contact, announcement and fulfillment settings save together.
          </p>
          <button
            type="submit"
            disabled={saving || !pickupOptions.some((option) => option.value === pickupLocation)}
            className="button-primary"
          >
            {saving ? 'Saving…' : 'Save settings'}
          </button>
        </div>
      </form>
      <div id="settings-homepage" className="admin-settings-section">
        <AdminContentEditor
          settings={settings}
          onSaved={(updated) => {
            setSettings(updated)
            applySettings(updated)
          }}
        />
      </div>
    </div>
  )
}

export default AdminSettingsPage
