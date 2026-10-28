import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useSiteSettings } from '../../context/SiteSettingsContext'
import { adminApiService } from '../../lib/services/admin/admin.service'
import type { CourierOption, FulfillOrderResult, OrderDetail } from '../../lib/types/order'
import { formatPrice } from '../../lib/utils/format'
import { Dropdown } from '../ui/Dropdown'
import { Textarea } from '../ui/Textarea'

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
  const [recommendedCourierId, setRecommendedCourierId] = useState<number | null>(null)
  const [overrideReason, setOverrideReason] = useState('')
  const [courierLookupAvailable, setCourierLookupAvailable] = useState<boolean | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<FulfillOrderResult | null>(null)
  const selected = locations.find((location) => location.pickup_location === pickup)
  const blocked =
    order.paymentStatus !== 'paid' ||
    ['cancelled', 'refunded', 'returned', 'delivered', 'lost', 'damaged'].includes(order.status) ||
    order.providerOperations?.some(
      (operation) =>
        ['shiprocket', 'razorpay'].includes(operation.provider) &&
        operation.state !== 'provider_failed' &&
        !(operation.state === 'provider_succeeded' && operation.local_applied_at)
    )
  const validPackage = [weight, length, breadth, height].every(
    (value) => Number.isInteger(value) && value > 0
  )
  const ready = settings.configuration.fulfillment_ready && selected && validPackage && !blocked
  const hasOverride =
    !!courier && recommendedCourierId !== null && Number(courier) !== recommendedCourierId
  const validOverride = !hasOverride || overrideReason.trim().length >= 3

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
    setRecommendedCourierId(null)
    setOverrideReason('')
    setCourierLookupAvailable(null)
  }, [pickup, weight, length, breadth, height])

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
    setCouriers([])
    setCourier('')
    setRecommendedCourierId(null)
    setOverrideReason('')
    setCourierLookupAvailable(false)
    const response = await adminApiService.getOrderCouriers(order.id, {
      pickup_location: pickup,
      weight_grams: weight,
      length_cm: length,
      breadth_cm: breadth,
      height_cm: height,
    })
    if (!response.success) throw new Error(response.error.message)
    setCouriers(response.data.available ? response.data.couriers : [])
    setCourierLookupAvailable(response.data.available)
    setRecommendedCourierId(response.data.recommended_courier?.courier_id ?? null)
    setCourier(
      response.data.recommended_courier ? String(response.data.recommended_courier.courier_id) : ''
    )
    setOverrideReason('')
    if (!response.data.available)
      throw new Error(
        'No eligible courier serves this order and package. Review the delivery details or try again later.'
      )
  }
  const fulfill = async () => {
    const response = await adminApiService.fulfillOrder(order.id, {
      pickup_location: pickup,
      weight_grams: weight,
      length_cm: length,
      breadth_cm: breadth,
      height_cm: height,
      ...(courier ? { courier_id: Number(courier) } : {}),
      ...(hasOverride ? { courier_override_reason: overrideReason.trim() } : {}),
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
          onChange={(value) => {
            setCourier(value)
            setOverrideReason('')
          }}
          disabled={busy}
          options={couriers.map((option) => ({
            value: String(option.courier_id),
            label: `${option.courier_name}${option.courier_id === recommendedCourierId ? ' (recommended)' : ''} — ${formatPrice(option.rate_paisa)} · ${option.estimated_delivery_days === null ? 'Estimate unavailable' : `${option.estimated_delivery_days} days`}`,
          }))}
        />
      )}
      {hasOverride && (
        <div>
          <label htmlFor="courier-override-reason" className="mb-2 block text-sm font-semibold">
            Reason for choosing another courier
          </label>
          <Textarea
            id="courier-override-reason"
            value={overrideReason}
            onChange={(event) => setOverrideReason(event.target.value)}
            disabled={busy}
            minLength={3}
            maxLength={1000}
            rows={2}
            aria-describedby="courier-override-help"
            className="resize-none"
          />
          <p id="courier-override-help" className="mt-1 text-sm text-muted">
            Record why this courier is appropriate. The reason is saved with the order audit.
          </p>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="button-primary"
          disabled={
            busy ||
            !ready ||
            !validOverride ||
            courierLookupAvailable === false ||
            order.fulfillmentStep === 'ready_for_pickup'
          }
          onClick={() => void action(fulfill)}
        >
          {busy ? 'Working…' : order.shiprocketOrderId ? 'Resume fulfillment' : 'Fulfill order'}
        </button>
        <button
          type="button"
          className="button-secondary"
          disabled={
            busy ||
            !ready ||
            !validOverride ||
            courierLookupAvailable === false ||
            !order.shipmentId ||
            Boolean(order.awbCode)
          }
          onClick={() =>
            void action(async () => {
              const response = await adminApiService.assignAwb(
                order.id,
                courier ? Number(courier) : undefined,
                hasOverride ? overrideReason.trim() : undefined
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
