import React, { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { adminApiService } from '../../lib/api/admin'
import type { OrderDetail, OrderStatus } from '../../types/order'
import { formatPrice, formatDate } from '../../lib/format'
import { useToast } from '../../hooks/useToast'
import Button from '../../components/ui/Button'
import Select from '../../components/ui/Select'
import Input from '../../components/ui/Input'
import Card, { CardContent, CardHeader, CardTitle } from '../../components/ui/Card'
import LoadingSpinner from '../../components/shared/LoadingSpinner'
import ErrorState from '../../components/shared/ErrorState'
import ShiprocketTracker from '../../components/shared/ShiprocketTracker'
import { ArrowLeft, Phone, Mail, Package } from 'lucide-react'

export const AdminOrderDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const { showToast } = useToast()

  const [order, setOrder] = useState<OrderDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [savingAwb, setSavingAwb] = useState(false)
  const [addingNote, setAddingNote] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Status update
  const [orderStatus, setOrderStatus] = useState<OrderStatus>('pending')

  // AWB code field
  const [awbCode, setAwbCode] = useState('')

  // Admin notes state
  const [noteText, setNoteText] = useState('')

  const fetchOrderDetails = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    const res = await adminApiService.getOrderById(id)
    if (res.success) {
      setOrder(res.data)
      setOrderStatus(res.data.status)
      setAwbCode(res.data.awbCode || '')
    } else {
      setError(res.error.message || 'Failed to fetch order.')
    }
    setLoading(false)
  }, [id])

  useEffect(() => {
    fetchOrderDetails()
  }, [fetchOrderDetails])

  const handleUpdateStatus = async () => {
    if (!order) return
    setUpdatingStatus(true)
    const res = await adminApiService.updateOrderStatus(order.id, orderStatus)
    setUpdatingStatus(false)

    if (res.success) {
      showToast('Order status updated successfully.', 'success')
      setOrder(res.data)
    } else {
      showToast(res.error.message || 'Status update failed.', 'error')
    }
  }

  const handleSaveAwb = async () => {
    if (!order) return
    setSavingAwb(true)
    const res = await adminApiService.updateOrderFulfillment(order.id, {
      awbCode: awbCode.trim() || null,
    })
    setSavingAwb(false)

    if (res.success) {
      showToast(
        awbCode.trim() ? 'AWB code saved. Order marked as fulfilled.' : 'AWB code cleared.',
        'success'
      )
      setOrder(res.data)
    } else {
      showToast(res.error.message || 'Failed to save AWB code.', 'error')
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

  const orderStatusOptions = [
    { value: 'pending', label: 'Pending' },
    { value: 'confirmed', label: 'Confirmed' },
    { value: 'processing', label: 'Processing' },
    { value: 'shipped', label: 'Shipped' },
    { value: 'delivered', label: 'Delivered' },
    { value: 'cancelled', label: 'Cancelled' },
  ]

  if (loading) {
    return <LoadingSpinner fullPage={true} />
  }

  if (error || !order) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-8">
        <ErrorState message={error || 'Order not found.'} onRetry={fetchOrderDetails} />
      </div>
    )
  }

  return (
    <div className="space-y-6 text-left max-w-5xl mx-auto pb-12">
      {/* Header Title */}
      <div className="flex items-center gap-3">
        <Link
          to="/admin/orders"
          className="border border-secondary300 bg-white p-2 rounded-full hover:bg-lightgrayColor transition-colors shrink-0"
        >
          <ArrowLeft className="w-4.5 h-4.5 text-secondary700" />
        </Link>
        <div>
          <h2 className="text-xl md:text-2xl font-medium tracking-wide text-darkColor">
            Fulfill Order {order.orderNumber}
          </h2>
          <p className="text-xs text-secondary500 tracking-wide mt-0.5">
            Placed on {formatDate(order.createdAt)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT COLUMN: FULFILLMENT CONTROLS & ITEMS */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Status + AWB Manager */}
          <Card className="border border-secondary200">
            <CardHeader>
              <CardTitle>Logistics Fulfillment Center</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Order Status */}
              <div className="flex flex-col sm:flex-row gap-4 items-end justify-between border-b border-secondary200 pb-5">
                <div className="w-full sm:max-w-xs">
                  <Select
                    label="Update Order Status"
                    options={orderStatusOptions}
                    value={orderStatus}
                    onChange={(e) => setOrderStatus(e.target.value as OrderStatus)}
                  />
                </div>
                <Button
                  onClick={handleUpdateStatus}
                  loading={updatingStatus}
                  disabled={savingAwb || addingNote}
                  className="w-full sm:w-auto text-xs py-2.5 px-4 font-medium shrink-0"
                >
                  Update Order State
                </Button>
              </div>

              {/* AWB Code Entry */}
              <div className="space-y-3 pt-1">
                <div>
                  <h4 className="text-xs font-medium text-secondary700 uppercase tracking-widest mb-0.5">
                    Shiprocket AWB Code
                  </h4>
                  <p className="text-[11px] text-secondary400 leading-snug">
                    Create the shipment in Shiprocket, then paste the AWB code here. Live tracking
                    will be activated automatically.
                  </p>
                </div>
                <div className="flex gap-3 items-end">
                  <div className="flex-1">
                    <Input
                      label="AWB Code"
                      placeholder="E.g. 141123221084922"
                      value={awbCode}
                      onChange={(e) => setAwbCode(e.target.value)}
                      maxLength={100}
                    />
                  </div>
                  <Button
                    onClick={handleSaveAwb}
                    loading={savingAwb}
                    disabled={updatingStatus || addingNote}
                    className="text-xs py-2.5 px-4 font-medium shrink-0"
                  >
                    Save AWB
                  </Button>
                </div>
                {/* Current saved AWB display */}
                {order.awbCode && (
                  <div className="flex items-center gap-2 p-3 bg-lightgrayColor border border-secondary200 rounded-lg">
                    <Package className="w-4 h-4 text-primaryBg shrink-0" />
                    <div>
                      <p className="text-[10px] text-secondary500 uppercase tracking-wider font-medium">
                        Current AWB
                      </p>
                      <p className="text-sm font-bold text-darkColor">{order.awbCode}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Shiprocket Tracking Preview in Admin */}
              {order.awbCode && (
                <div className="pt-2 border-t border-secondary200">
                  <h4 className="text-xs font-medium text-secondary700 uppercase tracking-widest mb-4">
                    Live Tracking Preview
                  </h4>
                  <ShiprocketTracker awbCode={order.awbCode} />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Order Items Table */}
          <Card className="border border-secondary200">
            <div className="p-5 border-b border-secondary200 bg-lightgrayColor/30">
              <h3 className="text-sm font-medium text-darkColor uppercase tracking-widest flex items-center gap-2">
                Purchased Items
              </h3>
            </div>
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
                    <div className="flex-grow flex items-center justify-between text-left gap-4">
                      <div>
                        <h4 className="text-xs md:text-sm font-medium text-darkColor leading-snug">
                          {item.productName}
                        </h4>
                        <span className="text-[10px] text-secondary500 font-normal block mt-1 uppercase tracking-widest">
                          Unit price: {formatPrice(item.unitPrice)}
                        </span>
                      </div>
                      <div className="text-right whitespace-nowrap">
                        <p className="text-xs font-normal text-secondary600">
                          Qty: {item.quantity}
                        </p>
                        <p className="text-xs font-medium text-darkColor mt-0.5">
                          {formatPrice(item.totalPrice)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN: CUSTOMER INFO, BILLING, INTERNAL NOTES */}
        <div className="space-y-6">
          {/* Customer Card */}
          <Card className="border border-secondary200">
            <div className="p-4 border-b border-secondary200 bg-lightgrayColor/30">
              <h3 className="text-xs font-bold text-darkColor uppercase tracking-widest flex items-center gap-2">
                Customer Identity
              </h3>
            </div>
            <CardContent className="p-4 text-xs md:text-sm text-left space-y-3">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-secondary500 block font-semibold mb-0.5">
                  Contact Name
                </span>
                <span className="font-semibold text-darkColor">{order.customer?.fullName}</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <Phone className="w-4 h-4 text-secondary400 shrink-0" />
                <span className="font-medium text-secondary700">{order.customer?.phone}</span>
              </div>
              <div className="flex items-center gap-2 text-xs truncate">
                <Mail className="w-4 h-4 text-secondary400 shrink-0" />
                <span className="font-medium text-secondary700 truncate">
                  {order.customer?.email}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Delivery destination */}
          <Card className="border border-secondary200">
            <div className="p-4 border-b border-secondary200 bg-lightgrayColor/30">
              <h3 className="text-xs font-bold text-darkColor uppercase tracking-widest flex items-center gap-2">
                Shipping Destination
              </h3>
            </div>
            <CardContent className="p-4 text-left text-xs md:text-sm space-y-2">
              <p className="font-semibold text-darkColor">{order.shippingAddress.fullName}</p>
              <p className="text-secondary600 text-xs leading-relaxed">
                {order.shippingAddress.line1}
                {order.shippingAddress.line2 && `, ${order.shippingAddress.line2}`}
                <br />
                {order.shippingAddress.city}, {order.shippingAddress.state} -{' '}
                {order.shippingAddress.pincode}
              </p>
              <p className="font-medium text-secondary750 text-xs flex items-center gap-1.5 mt-1">
                <Phone className="w-3.5 h-3.5 text-secondary400" />
                {order.shippingAddress.phone}
              </p>
              {order.deliveryInstructions && (
                <div className="mt-3 pt-3 border-t border-secondary200/50">
                  <span className="text-secondary500 block mb-1 text-[9px] uppercase tracking-wider font-semibold">
                    Delivery Instructions
                  </span>
                  <p className="font-normal text-secondary700 text-xs italic bg-lightgrayColor/40 p-2.5 rounded-lg border border-secondary200/50 leading-relaxed">
                    "{order.deliveryInstructions}"
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* INTERNAL NOTES LOGGER */}
          <Card className="border border-secondary200">
            <div className="p-4 border-b border-secondary200 bg-lightgrayColor/30">
              <h3 className="text-xs font-bold text-darkColor uppercase tracking-widest">
                Internal Logs & Notes
              </h3>
            </div>
            <CardContent className="p-4 text-left space-y-4">
              {/* Note records */}
              <div className="max-h-64 overflow-y-auto no-scrollbar border-b border-secondary200/50 pb-4 pr-1">
                {!order.adminNotes || order.adminNotes.length === 0 ? (
                  <p className="text-xs text-secondary500 italic py-1">
                    No custom administrative notes logged.
                  </p>
                ) : (
                  <div className="relative pl-4 border-l border-secondary200 space-y-4 ml-2 pt-1">
                    {order.adminNotes.map((note) => (
                      <div key={note.id} className="relative space-y-1">
                        {/* Timeline dot */}
                        <div className="absolute -left-[21px] top-1.5 w-2 h-2 rounded-full bg-primaryBg border border-white ring-2 ring-primary100" />
                        <div className="bg-lightgrayColor/50 border border-secondary200/60 p-2.5 rounded-lg text-xs">
                          <p className="text-secondary700 leading-normal font-medium">
                            {note.note}
                          </p>
                          <div className="flex justify-between items-center text-[9px] text-secondary400 mt-2 font-medium">
                            <span>By: {note.createdBy}</span>
                            <span>{formatDate(note.createdAt)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Add Note Form */}
              <form onSubmit={handleAddNote} className="space-y-2">
                <textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Log custom instructions, packaging requests..."
                  rows={2}
                  className="w-full text-xs p-2.5 border border-secondary300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primaryBg/30 focus:border-primaryBg bg-white"
                  disabled={updatingStatus || savingAwb || addingNote}
                  maxLength={2000}
                />
                <Button
                  type="submit"
                  variant="secondary"
                  size="sm"
                  loading={addingNote}
                  disabled={updatingStatus || savingAwb}
                  className="w-full text-xs font-medium"
                >
                  Add Internal Note
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default AdminOrderDetail
