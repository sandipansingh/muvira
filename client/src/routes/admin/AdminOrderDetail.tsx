import React, { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { adminApiService } from '../../lib/api/admin'
import type { OrderDetail, FulfillmentStepResult, CourierOption } from '../../types/order'
import { formatPrice, formatDate } from '../../lib/format'
import { useToast } from '../../hooks/useToast'
import Button from '../../components/ui/Button'
import Select from '../../components/ui/Select'
import Input from '../../components/ui/Input'
import Card, { CardContent, CardHeader, CardTitle } from '../../components/ui/Card'
import Dialog from '../../components/ui/Dialog'
import LoadingSpinner from '../../components/shared/LoadingSpinner'
import ErrorState from '../../components/shared/ErrorState'
import ShiprocketTracker from '../../components/shared/ShiprocketTracker'
import Badge from '../../components/ui/Badge'
import {
  ArrowLeft,
  Phone,
  Mail,
  Package,
  AlertTriangle,
  MapPin,
  Send,
  Truck,
  CheckCircle,
  XCircle,
  Loader2,
  Download,
  Clock,
  Scale,
  Ruler,
  Box,
  ShoppingBag,
  CreditCard,
  User,
  MapPinHouse,
  RefreshCw,
} from 'lucide-react'

const FULFILLMENT_STEP_LABELS: Record<string, string> = {
  order_created: 'Shiprocket Order Created',
  awb_assigned: 'AWB Assigned',
  pickup_scheduled: 'Pickup Scheduled',
  label_generated: 'Label Generated',
  manifest_generated: 'Manifest Generated',
  ready_for_pickup: 'Ready for Pickup',
}

const STEP_ORDER = [
  'order_created',
  'awb_assigned',
  'pickup_scheduled',
  'label_generated',
  'manifest_generated',
  'ready_for_pickup',
]

export const AdminOrderDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const { showToast } = useToast()

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'delivered':
        return 'success'
      case 'cancelled':
      case 'lost':
      case 'damaged':
        return 'danger'
      case 'shipped':
      case 'out_for_delivery':
      case 'processing':
      case 'confirmed':
        return 'primary'
      case 'rto':
      case 'returned':
      case 'refunded':
        return 'warning'
      case 'delivery_failed':
        return 'danger'
      default:
        return 'warning'
    }
  }

  const [order, setOrder] = useState<OrderDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fulfillment dialog
  const [showFulfillDialog, setShowFulfillDialog] = useState(false)
  const [fulfilling, setFulfilling] = useState(false)
  const [fulfillSteps, setFulfillSteps] = useState<FulfillmentStepResult[]>([])
  const [fulfillError, setFulfillError] = useState<string | null>(null)
  const [fulfillResult, setFulfillResult] = useState<{
    awb_code: string | null
    courier_name: string | null
    label_generated: boolean
    manifest_generated: boolean
    pickup_scheduled_date: string | null
  } | null>(null)

  // Pickup locations
  const [pickupLocations, setPickupLocations] = useState<
    Array<{
      pickup_location: string
      id: number
      address: string
      city: string
      state: string
      pin_code: string
    }>
  >([])
  const [selectedPickup, setSelectedPickup] = useState('')

  // Package details
  const [packageWeight, setPackageWeight] = useState(500)
  const [packageLength, setPackageLength] = useState(15)
  const [packageBreadth, setPackageBreadth] = useState(10)
  const [packageHeight, setPackageHeight] = useState(5)
  const [packageCount, setPackageCount] = useState(1)

  // Courier
  const [couriers, setCouriers] = useState<CourierOption[]>([])
  const [checkingServiceability, setCheckingServiceability] = useState(false)
  const [selectedCourierId, setSelectedCourierId] = useState<number | undefined>(undefined)

  // Admin notes
  const [noteText, setNoteText] = useState('')
  const [addingNote, setAddingNote] = useState(false)

  const fetchOrderDetails = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    const res = await adminApiService.getOrderById(id)
    if (res.success) {
      setOrder(res.data)
      // Prepopulate package dimensions if available
      if (res.data.packageWeightGrams) setPackageWeight(res.data.packageWeightGrams)
      if (res.data.packageLengthCm) setPackageLength(res.data.packageLengthCm)
      if (res.data.packageBreadthCm) setPackageBreadth(res.data.packageBreadthCm)
      if (res.data.packageHeightCm) setPackageHeight(res.data.packageHeightCm)
    } else {
      setError(res.error.message || 'Failed to fetch order.')
    }
    setLoading(false)
  }, [id])

  useEffect(() => {
    fetchOrderDetails()
  }, [fetchOrderDetails])

  const loadPickupLocations = useCallback(async () => {
    const srRes = await adminApiService.getPickupLocations()
    if (srRes.success) setPickupLocations(srRes.data)
  }, [])

  useEffect(() => {
    if (order && !order.shiprocketOrderId) {
      loadPickupLocations()
    }
  }, [order, order?.shiprocketOrderId, loadPickupLocations])

  const handleOpenFulfillDialog = async () => {
    await loadPickupLocations()
    const allLocations = pickupLocations.map((l) => l.pickup_location)
    if (allLocations.length > 0 && !selectedPickup) {
      setSelectedPickup(allLocations[0])
    }
    setFulfillSteps([])
    setFulfillError(null)
    setFulfillResult(null)
    setShowFulfillDialog(true)
  }

  const handleCheckServiceability = async () => {
    if (!order) return
    const srLoc = pickupLocations.find((l) => l.pickup_location === selectedPickup)
    const pickupPincode = srLoc?.pin_code

    if (!pickupPincode || !order.shippingAddress.pincode) {
      showToast('Pickup and delivery pincodes required for serviceability check', 'error')
      return
    }

    setCheckingServiceability(true)
    const res = await adminApiService.checkServiceability({
      pickup_pincode: pickupPincode,
      delivery_pincode: order.shippingAddress.pincode,
      weight: Math.max(Math.round(packageWeight / 1000), 1),
      cod: order.paymentStatus !== 'paid',
    })
    setCheckingServiceability(false)

    if (res.success) {
      const all = res.data.available_courier || []
      setCouriers(
        all.map((c) => ({
          ...c,
          is_recommended: res.data.recommended_courier?.courier_id === c.courier_id,
        }))
      )
      // Auto-select recommended
      if (res.data.recommended_courier) {
        setSelectedCourierId(res.data.recommended_courier.courier_id)
      }
      showToast(`${all.length} couriers available`, 'success')
    } else {
      showToast(res.error.message || 'Serviceability check failed', 'error')
    }
  }

  const handleFulfillOrder = async () => {
    if (!order || !selectedPickup) return
    setFulfilling(true)
    setFulfillSteps([])
    setFulfillError(null)
    setFulfillResult(null)

    const res = await adminApiService.fulfillOrder(order.id, {
      pickup_location: selectedPickup,
      weight_grams: packageWeight,
      length_cm: packageLength,
      breadth_cm: packageBreadth,
      height_cm: packageHeight,
      package_count: packageCount,
      courier_id: selectedCourierId,
      payment_method: order.paymentStatus === 'paid' ? 'Prepaid' : 'COD',
      cod_amount: order.paymentStatus !== 'paid' ? order.totalAmount : undefined,
    })

    setFulfilling(false)

    if (res.success && res.data) {
      setFulfillSteps(res.data.steps || [])
      if (res.data.success) {
        setFulfillResult({
          awb_code: res.data.awb_code,
          courier_name: res.data.courier_name,
          label_generated: res.data.label_generated,
          manifest_generated: res.data.manifest_generated,
          pickup_scheduled_date: res.data.pickup_scheduled_date,
        })
        showToast('Order fulfilled successfully!', 'success')
        fetchOrderDetails()
      } else {
        setFulfillError(res.data.error || 'Fulfillment failed')
        setFulfillSteps(res.data.steps || [])
        showToast(res.data.error || 'Fulfillment failed. Check details.', 'error')
      }
    } else {
      const errMsg =
        ('error' in res && res.error ? (res.error as { message: string }).message : null) ||
        'Fulfillment failed'
      setFulfillError(errMsg)
      showToast(errMsg, 'error')
    }
  }

  const handleRetryFulfill = () => {
    handleFulfillOrder()
  }

  const handleDownloadLabel = async () => {
    if (!order) return
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session?.access_token) {
        showToast('Session expired. Please log in again.', 'error')
        return
      }
      const res = await fetch(`/api/admin/orders/${order.id}/generate-label`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (res.ok) {
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `label-${order.orderNumber}.pdf`
        a.click()
        URL.revokeObjectURL(url)
      } else {
        showToast('Failed to download label', 'error')
      }
    } catch {
      showToast('Failed to download label', 'error')
    }
  }

  const handleDownloadManifest = async () => {
    if (!order) return
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session?.access_token) {
        showToast('Session expired. Please log in again.', 'error')
        return
      }
      const res = await fetch(`/api/admin/orders/${order.id}/generate-manifest`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (res.ok) {
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `manifest-${order.orderNumber}.pdf`
        a.click()
        URL.revokeObjectURL(url)
      } else {
        showToast('Failed to download manifest', 'error')
      }
    } catch {
      showToast('Failed to download manifest', 'error')
    }
  }

  const handleDownloadInvoice = async () => {
    if (!order) return
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session?.access_token) {
        showToast('Session expired. Please log in again.', 'error')
        return
      }
      const res = await fetch(`/api/admin/orders/${order.id}/generate-invoice`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (res.ok) {
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `invoice-${order.orderNumber}.pdf`
        a.click()
        URL.revokeObjectURL(url)
      } else {
        showToast('Failed to download invoice', 'error')
      }
    } catch {
      showToast('Failed to download invoice', 'error')
    }
  }

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!noteText.trim() || !order) return
    setAddingNote(true)
    const res = await adminApiService.addOrderNote(order.id, noteText.trim())
    setAddingNote(false)
    if (res.success) {
      showToast('Internal note added.', 'success')
      setNoteText('')
      setOrder(res.data)
    } else {
      showToast(res.error.message || 'Failed to save note.', 'error')
    }
  }

  const allPickupOptions = pickupLocations.map((l) => ({
    value: l.pickup_location,
    label: `${l.pickup_location} — ${l.city}, ${l.state}`,
  }))

  const volumetricWeight = Math.round((packageLength * packageBreadth * packageHeight) / 5000)

  if (loading) return <LoadingSpinner fullPage={true} />
  if (error || !order)
    return (
      <div className="max-w-4xl mx-auto px-6 py-8">
        <ErrorState message={error || 'Order not found.'} onRetry={fetchOrderDetails} />
      </div>
    )

  const isFulfillmentComplete = order.fulfillmentStep === 'ready_for_pickup'
  const isFulfillmentInProgress =
    order.fulfillmentStep &&
    order.fulfillmentStep !== 'idle' &&
    order.fulfillmentStep !== 'ready_for_pickup'

  return (
    <div className="space-y-6 text-left max-w-6xl mx-auto px-4 md:px-6 pb-12 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-secondary200 pb-5">
        <div className="flex items-center gap-3">
          <Link
            to="/admin/orders"
            className="border border-secondary300 bg-white p-2 rounded-lg hover:bg-neutral-50 transition-colors shrink-0 shadow-sm"
          >
            <ArrowLeft className="w-4 h-4 text-secondary700" />
          </Link>
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="text-xl md:text-2xl font-bold tracking-tight text-darkColor">
                {order.orderNumber}
              </h2>
              <Badge variant={getStatusVariant(order.status)}>{order.status}</Badge>
            </div>
            <p className="text-sm text-secondary500 mt-1">
              Placed on {formatDate(order.createdAt)}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: Main Order and Fulfillment Details (8/12 = 2/3 width) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Ordered Products */}
          <Card className="border border-secondary200">
            <CardHeader>
              <CardTitle>Ordered Products</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-secondary200/50">
                {order.items.map((item) => (
                  <div key={item.id} className="p-4 flex gap-4">
                    <div className="w-14 h-14 bg-lightgrayColor border border-secondary200 rounded overflow-hidden shrink-0">
                      <img
                        src={item.productImage}
                        alt={item.productName}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-grow flex items-center justify-between gap-4">
                      <div>
                        <h4 className="text-sm md:text-base font-semibold text-darkColor leading-snug">
                          {item.productName}
                        </h4>
                        <span className="text-xs md:text-sm text-secondary500 font-normal block mt-1">
                          Qty: {item.quantity} &times; {formatPrice(item.unitPrice)}
                        </span>
                      </div>
                      <div className="text-right whitespace-nowrap">
                        <p className="text-sm md:text-base font-bold text-darkColor">
                          {formatPrice(item.totalPrice)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-4 border-t border-secondary200 bg-lightgrayColor/20 space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-secondary500">Subtotal</span>
                  <span className="text-secondary700 font-semibold">
                    {formatPrice(order.subtotal)}
                  </span>
                </div>
                {order.discountAmount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-secondary500">Discount</span>
                    <span className="text-emerald-600 font-semibold">
                      -{formatPrice(order.discountAmount)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-secondary500">Shipping</span>
                  <span className="text-secondary700 font-semibold">
                    {formatPrice(order.shippingAmount)}
                  </span>
                </div>
                <div className="flex justify-between text-base font-bold pt-1.5 border-t border-secondary200">
                  <span className="text-darkColor">Total</span>
                  <span className="text-darkColor">{formatPrice(order.totalAmount)}</span>
                </div>
                {order.packageWeightGrams && (
                  <div className="flex items-center gap-4 pt-2 text-xs text-secondary500 uppercase tracking-wider">
                    <span className="flex items-center gap-1">
                      <Scale className="w-3.5 h-3.5" /> {order.packageWeightGrams}g
                    </span>
                    {order.packageLengthCm && (
                      <span className="flex items-center gap-1">
                        <Ruler className="w-3.5 h-3.5" /> {order.packageLengthCm}&times;
                        {order.packageBreadthCm}&times;{order.packageHeightCm} cm
                      </span>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Fulfillment Panel */}
          <Card className="border border-secondary200">
            <CardHeader>
              <CardTitle>Fulfillment Panel</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Fulfillment Status */}
              <div>
                <span className="text-xs uppercase tracking-wider text-secondary500 font-semibold">
                  Status
                </span>
                <div className="mt-1">
                  {isFulfillmentComplete ? (
                    <div className="flex items-center gap-2 p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg">
                      <CheckCircle className="w-4 h-4 text-emerald-600" />
                      <span className="text-sm font-semibold text-emerald-700">
                        Ready for Pickup
                      </span>
                    </div>
                  ) : isFulfillmentInProgress ? (
                    <div className="flex items-center gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded-lg">
                      <Loader2 className="w-4 h-4 text-amber-600 animate-spin" />
                      <span className="text-sm font-semibold text-amber-700">
                        {FULFILLMENT_STEP_LABELS[order.fulfillmentStep!] || order.fulfillmentStep}
                      </span>
                    </div>
                  ) : order.shiprocketStatus === 'failed' ? (
                    <div className="flex items-center gap-2 p-2.5 bg-rose-50 border border-rose-200 rounded-lg">
                      <XCircle className="w-4 h-4 text-rose-500" />
                      <div>
                        <span className="text-sm font-semibold text-rose-700">Failed</span>
                        {order.shiprocketError && (
                          <p className="text-xs text-rose-600 mt-0.5">{order.shiprocketError}</p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 p-2.5 bg-secondary100 border border-secondary200 rounded-lg">
                      <Clock className="w-4 h-4 text-secondary400" />
                      <span className="text-sm font-medium text-secondary600">
                        Pending Fulfillment
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Fulfillment details when in progress / complete */}
              {(isFulfillmentInProgress || isFulfillmentComplete) && (
                <div className="space-y-2 pt-2 border-t border-secondary200">
                  {order.shiprocketOrderId && (
                    <div className="text-xs text-secondary500">
                      Shiprocket ID: {order.shiprocketOrderId}
                    </div>
                  )}
                  {order.shipmentId && (
                    <div className="text-xs text-secondary500">Shipment ID: {order.shipmentId}</div>
                  )}
                  {order.awbCode && (
                    <div className="flex items-center gap-2 p-2.5 bg-secondary100 rounded-lg">
                      <Package className="w-4 h-4 text-primaryBg shrink-0" />
                      <div>
                        <p className="text-xs uppercase tracking-wider text-secondary500 font-semibold">
                          AWB
                        </p>
                        <p className="text-base font-bold text-darkColor">{order.awbCode}</p>
                      </div>
                    </div>
                  )}
                  {order.courierName && (
                    <div className="text-sm text-secondary700">
                      Courier: <span className="font-semibold">{order.courierName}</span>
                    </div>
                  )}
                  {order.pickupScheduledDate && (
                    <div className="text-sm text-secondary700">
                      Pickup: {formatDate(order.pickupScheduledDate)}
                    </div>
                  )}
                </div>
              )}

              {/* Action buttons */}
              <div className="space-y-2 pt-2 border-t border-secondary200">
                {!order.shiprocketOrderId || order.shiprocketStatus === 'failed' ? (
                  <Button
                    onClick={handleOpenFulfillDialog}
                    className="w-full text-xs font-medium"
                    disabled={order.paymentStatus !== 'paid'}
                  >
                    <Send className="w-3.5 h-3.5" />
                    Create Shipment
                  </Button>
                ) : (
                  <>
                    <Button
                      onClick={handleOpenFulfillDialog}
                      variant="secondary"
                      className="w-full text-xs font-medium"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Resume / Retry Fulfillment
                    </Button>
                  </>
                )}

                {order.labelGenerated && (
                  <Button
                    onClick={handleDownloadLabel}
                    variant="secondary"
                    size="sm"
                    className="w-full text-xs font-medium"
                  >
                    <Download className="w-3.5 h-3.5" /> Download / Print Label
                  </Button>
                )}
                {order.awbCode && (
                  <Button
                    onClick={handleDownloadInvoice}
                    variant="secondary"
                    size="sm"
                    className="w-full text-xs font-medium"
                  >
                    <Download className="w-3.5 h-3.5" /> Download Invoice
                  </Button>
                )}
                {order.manifestGenerated && (
                  <Button
                    onClick={handleDownloadManifest}
                    variant="secondary"
                    size="sm"
                    className="w-full text-xs font-medium"
                  >
                    <Download className="w-3.5 h-3.5" /> Download Manifest
                  </Button>
                )}
                {order.awbCode && (
                  <p className="text-center text-[10px] text-secondary500 uppercase tracking-wider">
                    Shipment tracking auto-synced via Shiprocket
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Tracking */}
          {order.awbCode && (
            <Card className="border border-secondary200">
              <CardHeader>
                <CardTitle>Live Tracking</CardTitle>
              </CardHeader>
              <CardContent>
                <ShiprocketTracker awbCode={order.awbCode} />
              </CardContent>
            </Card>
          )}
        </div>

        {/* RIGHT COLUMN: Customer Context & Notes (4/12 = 1/3 width) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Customer Information */}
          <Card className="border border-secondary200">
            <CardHeader>
              <CardTitle>Customer Information</CardTitle>
            </CardHeader>
            <CardContent className="text-left text-sm space-y-3">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-secondary400 shrink-0" />
                <span className="font-semibold text-darkColor">
                  {order.customer?.fullName || order.shippingAddress.fullName}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-secondary400 shrink-0" />
                <span className="font-medium text-secondary700">
                  {order.customer?.phone || order.shippingAddress.phone}
                </span>
              </div>
              {order.customer?.email && (
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-secondary400 shrink-0" />
                  <span className="font-medium text-secondary700 truncate">
                    {order.customer.email}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-secondary400 shrink-0" />
                <span className="font-medium text-secondary700 capitalize">
                  {order.paymentStatus}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Shipping Address */}
          <Card className="border border-secondary200">
            <CardHeader>
              <CardTitle>Shipping Address</CardTitle>
            </CardHeader>
            <CardContent className="text-left text-sm space-y-3">
              <div className="flex items-start gap-2">
                <MapPinHouse className="w-4 h-4 text-secondary400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-darkColor">{order.shippingAddress.fullName}</p>
                  <p className="text-secondary600 leading-relaxed mt-0.5">
                    {order.shippingAddress.line1}
                    {order.shippingAddress.line2 && `, ${order.shippingAddress.line2}`}
                    <br />
                    {order.shippingAddress.city}, {order.shippingAddress.state} -{' '}
                    {order.shippingAddress.pincode}
                  </p>
                  <p className="font-medium text-secondary700 mt-1">
                    {order.shippingAddress.phone}
                  </p>
                </div>
              </div>
              {order.deliveryInstructions && (
                <div className="mt-3 pt-3 border-t border-secondary200/50">
                  <span className="text-xs font-semibold uppercase tracking-wider text-secondary500">
                    Instructions
                  </span>
                  <p className="text-secondary700 text-sm italic mt-1">
                    {order.deliveryInstructions}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Internal Notes */}
          <Card className="border border-secondary200">
            <CardHeader>
              <CardTitle>Internal Notes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="max-h-48 overflow-y-auto no-scrollbar border-b border-secondary200/50 pb-4">
                {!order.adminNotes || order.adminNotes.length === 0 ? (
                  <p className="text-sm text-secondary500 italic">No notes logged.</p>
                ) : (
                  <div className="relative pl-4 border-l border-secondary200 space-y-4 ml-2">
                    {order.adminNotes.map((note) => (
                      <div key={note.id} className="relative space-y-1">
                        <div className="absolute -left-[21px] top-1.5 w-2 h-2 rounded-full bg-primaryBg border border-white ring-2 ring-primary100" />
                        <div className="bg-lightgrayColor/50 border border-secondary200/60 p-2.5 rounded-lg text-sm">
                          <p className="text-secondary700 leading-normal">{note.note}</p>
                          <span className="text-xs text-secondary400 mt-1 block">
                            {formatDate(note.createdAt)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <form onSubmit={handleAddNote} className="space-y-2">
                <textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Log fulfillment notes..."
                  rows={2}
                  className="w-full text-sm p-2.5 border border-secondary300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primaryBg/30 focus:border-primaryBg bg-white"
                  disabled={addingNote}
                  maxLength={2000}
                />
                <Button
                  type="submit"
                  variant="secondary"
                  size="sm"
                  loading={addingNote}
                  className="w-full text-sm font-medium"
                >
                  Add Note
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* FULFILLMENT DIALOG */}
      <Dialog
        isOpen={showFulfillDialog}
        onClose={() => !fulfilling && setShowFulfillDialog(false)}
        title="Create Shipment"
        maxWidth="2xl"
      >
        <div className="space-y-6">
          {/* Section 1: Pickup Location */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-darkColor uppercase tracking-widest flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primaryBg" /> Pickup Location
            </h4>
            {allPickupOptions.length > 0 ? (
              <Select
                options={allPickupOptions}
                value={selectedPickup}
                onChange={(e) => setSelectedPickup(e.target.value)}
                disabled={fulfilling}
              />
            ) : (
              <p className="text-xs text-secondary400 italic">Loading pickup locations...</p>
            )}
          </div>

          {/* Section 2: Package Details */}
          <div className="space-y-3 pt-4 border-t border-secondary200">
            <h4 className="text-xs font-semibold text-darkColor uppercase tracking-widest flex items-center gap-2">
              <Box className="w-4 h-4 text-primaryBg" /> Package Details
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-semibold text-secondary600 uppercase tracking-wider">
                  Weight (grams)
                </label>
                <Input
                  value={String(packageWeight)}
                  onChange={(e) => setPackageWeight(Number(e.target.value) || 0)}
                  type="number"
                  min={1}
                  disabled={fulfilling}
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-secondary600 uppercase tracking-wider">
                  Package Count
                </label>
                <Input
                  value={String(packageCount)}
                  onChange={(e) => setPackageCount(Number(e.target.value) || 1)}
                  type="number"
                  min={1}
                  disabled={fulfilling}
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-secondary600 uppercase tracking-wider">
                  Length (cm)
                </label>
                <Input
                  value={String(packageLength)}
                  onChange={(e) => setPackageLength(Number(e.target.value) || 0)}
                  type="number"
                  min={1}
                  disabled={fulfilling}
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-secondary600 uppercase tracking-wider">
                  Breadth (cm)
                </label>
                <Input
                  value={String(packageBreadth)}
                  onChange={(e) => setPackageBreadth(Number(e.target.value) || 0)}
                  type="number"
                  min={1}
                  disabled={fulfilling}
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-secondary600 uppercase tracking-wider">
                  Height (cm)
                </label>
                <Input
                  value={String(packageHeight)}
                  onChange={(e) => setPackageHeight(Number(e.target.value) || 0)}
                  type="number"
                  min={1}
                  disabled={fulfilling}
                />
              </div>
              <div className="flex flex-col justify-end">
                <span className="text-[9px] text-secondary500 uppercase tracking-wider">
                  Volumetric Weight
                </span>
                <span className="text-xs font-semibold text-darkColor">
                  {(volumetricWeight / 1000).toFixed(2)} kg
                </span>
                <span className="text-[9px] text-secondary400">
                  ({packageLength}&times;{packageBreadth}&times;{packageHeight} &divide; 5000)
                </span>
              </div>
            </div>
            <div className="text-[10px] text-secondary500">
              Actual weight: {(packageWeight / 1000).toFixed(2)} kg | Chargeable:{' '}
              {Math.max(volumetricWeight, packageWeight) / 1000} kg
            </div>
          </div>

          {/* Section 3: Courier Serviceability */}
          <div className="space-y-3 pt-4 border-t border-secondary200">
            <h4 className="text-xs font-semibold text-darkColor uppercase tracking-widest flex items-center gap-2">
              <Truck className="w-4 h-4 text-primaryBg" /> Shipping
            </h4>
            <Button
              onClick={handleCheckServiceability}
              loading={checkingServiceability}
              variant="secondary"
              size="sm"
              disabled={fulfilling}
              className="text-xs"
            >
              Check Courier Availability
            </Button>
            {couriers.length > 0 && (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {couriers.map((c) => (
                  <label
                    key={c.courier_id}
                    className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedCourierId === c.courier_id
                        ? 'bg-primaryBg/5 border-primaryBg'
                        : 'bg-white border-secondary200 hover:border-secondary300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="courier"
                        checked={selectedCourierId === c.courier_id}
                        onChange={() => setSelectedCourierId(c.courier_id)}
                        className="accent-primaryBg"
                        disabled={fulfilling}
                      />
                      <div>
                        <p className="text-xs font-semibold text-darkColor">
                          {c.courier_name}
                          {c.is_recommended && (
                            <span className="ml-2 text-[9px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-medium">
                              Recommended
                            </span>
                          )}
                        </p>
                        <p className="text-[10px] text-secondary500">
                          Est. delivery: {c.estimated_delivery_days} days
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-semibold text-darkColor">
                        {formatPrice(c.rate * 100)}
                      </p>
                      {c.cod && <span className="text-[9px] text-amber-600">COD available</span>}
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Section 4: Shipping Summary */}
          <div className="space-y-3 pt-4 border-t border-secondary200">
            <h4 className="text-xs font-semibold text-darkColor uppercase tracking-widest flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-primaryBg" /> Shipping Summary
            </h4>
            <div className="bg-secondary100 rounded-lg p-3 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-secondary500">Customer</span>
                <span className="font-medium text-darkColor">{order.shippingAddress.fullName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-secondary500">Address</span>
                <span className="font-medium text-darkColor text-right max-w-[60%]">
                  {order.shippingAddress.city}, {order.shippingAddress.state} -{' '}
                  {order.shippingAddress.pincode}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-secondary500">Weight</span>
                <span className="font-medium text-darkColor">
                  {(Math.max(volumetricWeight, packageWeight) / 1000).toFixed(2)} kg
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-secondary500">Dimensions</span>
                <span className="font-medium text-darkColor">
                  {packageLength}&times;{packageBreadth}&times;{packageHeight} cm
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-secondary500">Payment</span>
                <span className="font-medium text-darkColor capitalize">{order.paymentStatus}</span>
              </div>
              {selectedCourierId && (
                <div className="flex justify-between pt-1.5 border-t border-secondary200">
                  <span className="text-secondary500">Courier</span>
                  <span className="font-medium text-darkColor">
                    {couriers.find((c) => c.courier_id === selectedCourierId)?.courier_name}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Fulfillment Progress */}
          {fulfillSteps.length > 0 && (
            <div className="space-y-3 pt-4 border-t border-secondary200">
              <h4 className="text-xs font-semibold text-darkColor uppercase tracking-widest">
                Progress
              </h4>
              <div className="space-y-2">
                {STEP_ORDER.map((step) => {
                  const stepResult = fulfillSteps.find((s) => s.step === step)
                  if (!stepResult) return null
                  const isCompleted =
                    stepResult.status === 'completed' || stepResult.status === 'skipped'
                  const isFailed = stepResult.status === 'failed'
                  return (
                    <div
                      key={step}
                      className={`flex items-center gap-3 p-2.5 rounded-lg text-xs ${
                        isCompleted
                          ? 'bg-emerald-50 border border-emerald-200'
                          : isFailed
                            ? 'bg-rose-50 border border-rose-200'
                            : 'bg-secondary100 border border-secondary200'
                      }`}
                    >
                      {isCompleted ? (
                        <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : isFailed ? (
                        <XCircle className="w-4 h-4 text-rose-500 shrink-0" />
                      ) : (
                        <Loader2 className="w-4 h-4 text-secondary400 animate-spin shrink-0" />
                      )}
                      <div>
                        <p
                          className={`font-semibold ${isCompleted ? 'text-emerald-700' : isFailed ? 'text-rose-700' : 'text-secondary600'}`}
                        >
                          {FULFILLMENT_STEP_LABELS[step]}
                        </p>
                        {stepResult.details?.awb_code && (
                          <p className="text-[10px] text-secondary500 mt-0.5">
                            AWB: {stepResult.details.awb_code}
                          </p>
                        )}
                        {stepResult.details?.error && (
                          <p className="text-[10px] text-rose-600 mt-0.5">
                            {stepResult.details.error}
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Error display */}
          {fulfillError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg space-y-2">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-rose-700">Fulfillment Failed</p>
                  <p className="text-[10px] text-rose-600 mt-0.5">{fulfillError}</p>
                </div>
              </div>
              <Button
                onClick={handleRetryFulfill}
                variant="secondary"
                size="sm"
                className="w-full text-xs"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Retry from Failed Step
              </Button>
            </div>
          )}

          {/* Success */}
          {fulfillResult && fulfillSteps.every((s) => s.status !== 'failed') && (
            <div className="space-y-3 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
                <span className="text-sm font-semibold text-emerald-700">
                  Shipment Created Successfully
                </span>
              </div>
              {fulfillResult.awb_code && (
                <p className="text-xs text-emerald-600">AWB: {fulfillResult.awb_code}</p>
              )}
              {fulfillResult.pickup_scheduled_date && (
                <p className="text-xs text-emerald-600">
                  Pickup scheduled: {formatDate(fulfillResult.pickup_scheduled_date)}
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                {fulfillResult.label_generated && (
                  <Button
                    onClick={handleDownloadLabel}
                    variant="secondary"
                    size="sm"
                    className="text-xs"
                  >
                    <Download className="w-3.5 h-3.5" /> Download / Print Label
                  </Button>
                )}
                {fulfillResult.awb_code && (
                  <Button
                    onClick={handleDownloadInvoice}
                    variant="secondary"
                    size="sm"
                    className="text-xs"
                  >
                    <Download className="w-3.5 h-3.5" /> Download Invoice
                  </Button>
                )}
                {fulfillResult.manifest_generated && (
                  <Button
                    onClick={handleDownloadManifest}
                    variant="secondary"
                    size="sm"
                    className="text-xs"
                  >
                    <Download className="w-3.5 h-3.5" /> Download Manifest
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Action Button */}
          {!fulfillResult && !fulfillError && (
            <Button
              onClick={handleFulfillOrder}
              loading={fulfilling}
              disabled={!selectedPickup || fulfilling}
              className="w-full text-sm font-semibold py-3"
            >
              <Send className="w-4 h-4" /> Fulfill Order
            </Button>
          )}

          {fulfillResult && (
            <Button
              onClick={() => setShowFulfillDialog(false)}
              variant="secondary"
              className="w-full text-xs"
            >
              Close
            </Button>
          )}
        </div>
      </Dialog>
    </div>
  )
}

export default AdminOrderDetail
