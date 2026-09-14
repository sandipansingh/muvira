import React, { useEffect, useState } from 'react'
import { Download, RefreshCw } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { Breadcrumbs } from '../../components/common/Breadcrumbs'
import { Dropdown } from '../../components/ui/Dropdown'
import { useToast } from '../../context/ToastContext'
import { adminApiService } from '../../lib/services/admin/admin.service'
import type { OrderDetail, OrderStatus } from '../../lib/types/order'
import { formatDate, formatPrice } from '../../lib/utils/format'

const statusOptions = [
  'pending',
  'confirmed',
  'processing',
  'shipped',
  'out_for_delivery',
  'delivered',
  'cancelled',
  'rto',
  'returned',
  'refunded',
  'lost',
  'damaged',
  'delivery_failed',
].map((status) => ({ value: status, label: status.replaceAll('_', ' ') }))

export const AdminOrderDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const { showToast } = useToast()
  const [order, setOrder] = useState<OrderDetail | null>(null)
  const [status, setStatus] = useState('pending')
  const [pickupLocation, setPickupLocation] = useState('')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadOrder = async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const response = await adminApiService.getOrderById(id)
      if (!response.success) throw new Error(response.error.message)
      setOrder(response.data)
      setStatus(response.data.status)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Order could not be loaded.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadOrder()
    // The order ID is the only route input that should trigger a reload.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const runAction = async (action: () => Promise<unknown>, successMessage: string) => {
    setBusy(true)
    setError(null)
    try {
      await action()
      showToast(successMessage, 'success')
      await loadOrder()
    } catch (reason) {
      const message =
        reason instanceof Error ? reason.message : 'The action could not be completed.'
      setError(message)
      showToast(message, 'error')
    } finally {
      setBusy(false)
    }
  }

  const downloadInvoice = async () => {
    if (!id || !order) return
    await runAction(async () => {
      const blob = await adminApiService.downloadInvoice(id)
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `invoice-${order.orderNumber}.pdf`
      anchor.click()
      URL.revokeObjectURL(url)
    }, 'Invoice downloaded.')
  }

  if (loading) return <div className="h-56 animate-pulse rounded-3xl bg-surface" />
  if (!order || !id) {
    return (
      <p className="rounded-2xl bg-danger-soft p-4 text-sm text-danger">
        {error ?? 'Order not found.'}
      </p>
    )
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Home', href: '/' },
          { label: 'Admin', href: '/admin' },
          { label: 'Orders', href: '/admin/orders' },
          { label: order.orderNumber },
        ]}
      />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="heading text-2xl">Order {order.orderNumber}</h2>
          <p className="mt-2 text-sm text-ink">Placed {formatDate(order.createdAt)}</p>
        </div>
        <button
          type="button"
          onClick={() => void loadOrder()}
          disabled={busy}
          className="button-secondary"
        >
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </div>
      {error && <p className="rounded-2xl bg-danger-soft p-4 text-sm text-danger">{error}</p>}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="panel space-y-4 p-5">
          <h3 className="heading text-xl">Status and customer</h3>
          <dl className="space-y-2 text-sm text-ink">
            <div>
              <dt className="text-muted">Customer</dt>
              <dd>{order.customer?.fullName ?? order.shippingAddress.fullName}</dd>
            </div>
            <div>
              <dt className="text-muted">Email</dt>
              <dd>{order.customer?.email ?? 'Unavailable'}</dd>
            </div>
            <div>
              <dt className="text-muted">Payment</dt>
              <dd>
                {order.paymentStatus} · {formatPrice(order.totalAmount)}
              </dd>
            </div>
            <div>
              <dt className="text-muted">Fulfillment</dt>
              <dd>{order.fulfillmentStatus}</dd>
            </div>
            <div>
              <dt className="text-muted">AWB</dt>
              <dd>{order.awbCode ?? 'Not assigned'}</dd>
            </div>
          </dl>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Dropdown
              value={status}
              options={statusOptions}
              onChange={setStatus}
              className="flex-1"
            />
            <button
              type="button"
              disabled={busy || status === order.status}
              onClick={() =>
                void runAction(async () => {
                  const response = await adminApiService.updateOrderStatus(
                    id,
                    status as OrderStatus
                  )
                  if (!response.success) throw new Error(response.error.message)
                }, 'Order status updated.')
              }
              className="button-primary"
            >
              Save status
            </button>
          </div>
        </section>

        <section className="panel space-y-4 p-5">
          <h3 className="heading text-xl">Manual fulfillment</h3>
          <input
            type="text"
            value={pickupLocation}
            onChange={(event) => setPickupLocation(event.target.value)}
            placeholder="Shiprocket pickup location"
            className="w-full rounded-xl border border-line bg-paper px-4 py-2 text-base text-ink"
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy || !pickupLocation.trim() || Boolean(order.shiprocketOrderId)}
              onClick={() =>
                void runAction(async () => {
                  const response = await adminApiService.createShipment(id, pickupLocation.trim())
                  if (!response.success) throw new Error(response.error.message)
                }, 'Shipment created.')
              }
              className="button-secondary"
            >
              Create shipment
            </button>
            <button
              type="button"
              disabled={busy || !order.shipmentId || Boolean(order.awbCode)}
              onClick={() =>
                void runAction(async () => {
                  const response = await adminApiService.assignAwb(id)
                  if (!response.success) throw new Error(response.error.message)
                }, 'AWB assigned.')
              }
              className="button-secondary"
            >
              Assign AWB
            </button>
            <button
              type="button"
              disabled={busy || !order.shipmentId || !order.awbCode}
              onClick={() =>
                void runAction(async () => {
                  const response = await adminApiService.schedulePickup(id)
                  if (!response.success) throw new Error(response.error.message)
                }, 'Pickup scheduled.')
              }
              className="button-secondary"
            >
              Schedule pickup
            </button>
            <button
              type="button"
              disabled={busy || order.paymentStatus !== 'paid' || !order.shiprocketOrderId}
              onClick={() => void downloadInvoice()}
              className="button-secondary"
            >
              <Download className="h-4 w-4" /> Invoice
            </button>
          </div>
        </section>
      </div>

      <section className="panel space-y-4 p-5">
        <h3 className="heading text-xl">Internal note</h3>
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          maxLength={2000}
          className="min-h-28 w-full rounded-xl border border-line bg-paper px-4 py-3 text-base text-ink"
        />
        <button
          type="button"
          disabled={busy || !note.trim()}
          onClick={() =>
            void runAction(async () => {
              const response = await adminApiService.addOrderNote(id, note.trim())
              if (!response.success) throw new Error(response.error.message)
              setNote('')
            }, 'Note added.')
          }
          className="button-primary"
        >
          Add note
        </button>
      </section>
      <Link to="/admin/orders" className="text-sm text-ink underline hover:text-primary">
        Back to orders
      </Link>
    </div>
  )
}

export default AdminOrderDetailPage
