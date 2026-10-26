import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useSiteSettings } from '../../context/SiteSettingsContext'
import { adminApiService } from '../../lib/services/admin/admin.service'
import type { CourierOption, FulfillOrderResult, OrderDetail } from '../../lib/types/order'
import { formatPrice } from '../../lib/utils/format'
import { Dropdown } from '../ui/Dropdown'

export function OrderFulfillmentControls({
  order,
  refresh,
}: {
  order: OrderDetail
  refresh: () => Promise<void>
}) {
  const { settings } = useSiteSettings()
  const defaults = settings.shiprocketSettings
  const [locations, setLocations] = useState<
    Array<{ pickup_location: string; pincode: string; city: string }>
  >([])
  const [pickup, setPickup] = useState(order.pickupLocation ?? defaults.pickupLocation)
  const [weight, setWeight] = useState(order.packageWeightGrams ?? defaults.defaultWeightGrams)
  const [length, setLength] = useState(order.packageLengthCm ?? defaults.defaultLengthCm)
  const [breadth, setBreadth] = useState(order.packageBreadthCm ?? defaults.defaultBreadthCm)
  const [height, setHeight] = useState(order.packageHeightCm ?? defaults.defaultHeightCm)
  const [couriers, setCouriers] = useState<CourierOption[]>([])
  const [courier, setCourier] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<FulfillOrderResult | null>(null)
  const selected = locations.find((location) => location.pickup_location === pickup)
  const blocked =
    order.paymentStatus !== 'paid' ||
    ['cancelled', 'refunded', 'returned', 'delivered'].includes(order.status) ||
    order.providerOperations?.some(
      (operation) => operation.provider === 'shiprocket' && operation.state !== 'provider_failed'
    )
  const validPackage = [weight, length, breadth, height].every(
    (value) => Number.isInteger(value) && value > 0
  )
  const ready = settings.configuration.fulfillment_ready && selected && validPackage && !blocked

  const loadLocations = async () => {
    setError(null)
    try {
      const response = await adminApiService.getPickupLocations()
      if (!response.success) throw new Error(response.error.message)
      setLocations(response.data)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Pickup locations are unavailable.')
    }
  }
  useEffect(() => {
    void loadLocations()
  }, [])
  useEffect(() => {
    if (!pickup && defaults.pickupLocation) setPickup(defaults.pickupLocation)
  }, [pickup, defaults.pickupLocation])
  useEffect(() => {
    setCouriers([])
    setCourier('')
  }, [pickup, weight])

  const action = async (work: () => Promise<void>) => {
    setBusy(true)
    setError(null)
    try {
      await work()
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'Fulfillment could not be confirmed. Refresh before retrying.'
      )
    } finally {
      setBusy(false)
    }
  }
  const checkCouriers = async () => {
    if (!selected) return
    const response = await adminApiService.checkServiceability({
      pickup_pincode: selected.pincode,
      delivery_pincode: order.shippingAddress.pincode,
      weight_grams: weight,
      cod: false,
    })
    if (!response.success) throw new Error(response.error.message)
    setCouriers(response.data.available_courier)
  }
  const fulfill = async () => {
    const response = await adminApiService.fulfillOrder(order.id, {
      pickup_location: pickup,
      weight_grams: weight,
      length_cm: length,
      breadth_cm: breadth,
      height_cm: height,
      ...(courier ? { courier_id: Number(courier) } : {}),
    })
    if (!response.success) throw new Error(response.error.message)
    setResult(response.data)
    await refresh()
    if (!response.data.success)
      throw new Error(
        response.data.error ??
          'A fulfillment step failed. Confirmed earlier steps are saved; resume when ready.'
      )
  }
  const download = async (kind: 'label' | 'manifest') => {
    const blob = await adminApiService.downloadFulfillmentDocument(order.id, kind)
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${order.orderNumber}-${kind}.pdf`
    link.click()
    URL.revokeObjectURL(url)
    await refresh()
  }

  return (
    <section className="panel space-y-4 p-5">
      <h3 className="heading text-xl">Fulfillment</h3>
      {!settings.configuration.fulfillment_ready && (
        <p className="text-warning">
          Complete{' '}
          <Link className="underline" to="/admin/settings">
            Shiprocket setup
          </Link>{' '}
          before fulfillment.
        </p>
      )}
      <p className="text-sm">
        Progress: {order.fulfillmentStep?.replaceAll('_', ' ') ?? 'Not started'}. Carrier costs are
        paid by the store; customer shipping stays free.
      </p>
      {error && (
        <p role="alert" className="text-danger">
          {error}
        </p>
      )}
      <Dropdown
        label="Registered pickup"
        value={pickup}
        onChange={setPickup}
        disabled={busy || Boolean(order.shiprocketOrderId)}
        options={locations.map((location) => ({
          value: location.pickup_location,
          label: `${location.pickup_location} — ${location.city} ${location.pincode}`,
        }))}
      />
      <button type="button" className="text-sm text-primary" onClick={() => void loadLocations()}>
        Refresh pickup locations
      </button>
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Weight g', value: weight, set: setWeight },
          { label: 'Length cm', value: length, set: setLength },
          { label: 'Breadth cm', value: breadth, set: setBreadth },
          { label: 'Height cm', value: height, set: setHeight },
        ].map((field) => (
          <label key={field.label} className="text-sm">
            {field.label}
            <input
              aria-label={field.label}
              disabled={busy || Boolean(order.shiprocketOrderId)}
              type="number"
              min="1"
              step="1"
              value={field.value}
              onChange={(event) => field.set(Number(event.target.value))}
              className="mt-1 w-full rounded-xl border border-line bg-paper p-3 text-base"
            />
          </label>
        ))}
      </div>
      <button
        type="button"
        className="button-secondary"
        disabled={busy || !ready}
        onClick={() => void action(checkCouriers)}
      >
        Check couriers
      </button>
      {couriers.length > 0 && (
        <Dropdown
          label="Courier (store cost)"
          value={courier}
          onChange={setCourier}
          options={couriers.map((option) => ({
            value: String(option.courier_id),
            label: `${option.courier_name} — ${formatPrice(option.rate_paisa)}`,
          }))}
        />
      )}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="button-primary"
          disabled={busy || !ready || order.fulfillmentStep === 'ready_for_pickup'}
          onClick={() => void action(fulfill)}
        >
          {busy ? 'Working…' : order.shiprocketOrderId ? 'Resume fulfillment' : 'Fulfill order'}
        </button>
        <button
          type="button"
          className="button-secondary"
          disabled={busy || !ready || !order.shipmentId || Boolean(order.awbCode)}
          onClick={() =>
            void action(async () => {
              const response = await adminApiService.assignAwb(
                order.id,
                courier ? Number(courier) : undefined
              )
              if (!response.success) throw new Error(response.error.message)
              await refresh()
            })
          }
        >
          Assign AWB
        </button>
        <button
          type="button"
          className="button-secondary"
          disabled={busy || !ready || !order.awbCode || Boolean(order.pickupScheduledDate)}
          onClick={() =>
            void action(async () => {
              const response = await adminApiService.schedulePickup(order.id)
              if (!response.success) throw new Error(response.error.message)
              await refresh()
            })
          }
        >
          Schedule pickup
        </button>
        {(['label', 'manifest'] as const).map((kind) => (
          <button
            type="button"
            key={kind}
            className="button-secondary"
            disabled={busy || !ready || !order.shipmentId}
            onClick={() => void action(() => download(kind))}
          >
            Download {kind}
          </button>
        ))}
      </div>
      {result && (
        <ol className="space-y-2 text-sm">
          {result.steps.map((step) => (
            <li key={step.step}>
              {step.step.replaceAll('_', ' ')}: {step.status}
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
