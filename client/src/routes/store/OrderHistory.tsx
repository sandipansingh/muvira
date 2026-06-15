import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ordersApiService } from '../../lib/api/orders'
import { trackingApiService } from '../../lib/api/tracking'
import type { OrderListItem } from '../../types/order'
import type { ShiprocketTrackData } from '../../types/order'
import { formatPrice, formatDate } from '../../lib/format'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import Card, { CardContent } from '../../components/ui/Card'
import Pagination from '../../components/ui/Pagination'
import Skeleton from '../../components/ui/Skeleton'
import Breadcrumb from '../../components/layout/Breadcrumb'
import EmptyState from '../../components/shared/EmptyState'
import ErrorState from '../../components/shared/ErrorState'
import { History, ArrowRight, Truck } from 'lucide-react'
import OrderStatusTracker from '../../components/shared/OrderStatusTracker'

export const OrderHistory: React.FC = () => {
  const navigate = useNavigate()
  const [orders, setOrders] = useState<OrderListItem[]>([])
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  // Map of awb_code → live current_status from Shiprocket
  const [liveStatuses, setLiveStatuses] = useState<Record<string, ShiprocketTrackData>>({})

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    setError(null)
    const res = await ordersApiService.getOrders(page, 10)
    if (res.success) {
      setOrders(res.data)
      setPagination(res.pagination)
      // Batch-fetch live Shiprocket statuses for orders that have an AWB
      const awbs = res.data.map((o) => o.awbCode).filter((a): a is string => !!a)
      if (awbs.length > 0) {
        const bulk = await trackingApiService.trackBulk(awbs)
        setLiveStatuses(bulk)
      }
    } else {
      setError(res.error.message || 'Failed to load order history')
    }
    setLoading(false)
  }, [page])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'delivered':
        return 'success'
      case 'cancelled':
        return 'danger'
      case 'shipped':
      case 'processing':
      case 'confirmed':
        return 'primary'
      default:
        return 'warning'
    }
  }

  const getPaymentVariant = (pStatus: string) => {
    switch (pStatus) {
      case 'paid':
        return 'success'
      case 'failed':
        return 'danger'
      default:
        return 'warning'
    }
  }

  if (error) {
    return (
      <div className="max-w-[1240px] mx-auto px-6 py-8">
        <ErrorState message={error} onRetry={fetchOrders} />
      </div>
    )
  }

  return (
    <div className="max-w-[1240px] mx-auto px-6 py-6 text-left">
      <Breadcrumb items={[{ label: 'Order History' }]} />

      <h1 className="text-xl md:text-2xl font-bold tracking-wide text-darkColor my-6">
        Order History
      </h1>

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="p-5 border border-secondary200 rounded-xl bg-white space-y-3">
              <div className="flex justify-between">
                <Skeleton className="h-5 w-36" />
                <Skeleton className="h-5 w-20" />
              </div>
              <Skeleton className="h-4 w-64" />
              <div className="flex gap-2">
                <Skeleton className="h-6 w-16 rounded-full" />
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      ) : orders.length === 0 ? (
        <EmptyState
          title="No Orders Found"
          description="You haven't placed any orders yet. Visit our collections to find premium designs."
          actionLabel="Go to Catalog"
          onAction={() => navigate('/products')}
          icon={<History className="w-12 h-12" />}
        />
      ) : (
        <div className="space-y-4">
          <div className="space-y-4">
            {orders.map((ord) => {
              const liveData = ord.awbCode ? liveStatuses[ord.awbCode] : null
              const liveStatus =
                liveData?.shipment_track_activities?.[0]?.['sr-status-label'] ??
                liveData?.shipment_track?.[0]?.current_status ??
                null

              return (
                <Card key={ord.id} className="border border-secondary200 shadow-xs">
                  <CardContent className="p-5 space-y-4 text-left">
                    {/* Top Row: Summary & Button */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <Link
                            to={`/orders/${ord.id}`}
                            className="text-sm font-bold text-darkColor hover:text-primaryBg hover:underline"
                          >
                            {ord.orderNumber}
                          </Link>
                          <span className="text-xs text-secondary500 font-medium">
                            {formatDate(ord.createdAt)}
                          </span>
                        </div>

                        <div className="flex items-center gap-4 text-xs font-medium text-secondary600">
                          <span>
                            Items: <b>{ord.itemCount}</b>
                          </span>
                          <span>
                            Total: <b className="text-darkColor">{formatPrice(ord.totalAmount)}</b>
                          </span>
                        </div>

                        {/* Status badges + live Shiprocket status */}
                        <div className="flex items-center gap-2 pt-1 flex-wrap">
                          <Badge variant={getStatusVariant(ord.status)}>{ord.status}</Badge>
                          <Badge variant={getPaymentVariant(ord.paymentStatus)}>
                            Payment: {ord.paymentStatus}
                          </Badge>
                          {/* Live Shiprocket status pill */}
                          {liveStatus && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 uppercase tracking-wider">
                              <Truck className="w-3 h-3" />
                              {liveStatus}
                            </span>
                          )}
                          {/* Fallback fulfillment status if no live data */}
                          {!liveStatus && ord.fulfillmentStatus !== 'unfulfilled' && (
                            <Badge variant="neutral">{ord.fulfillmentStatus}</Badge>
                          )}
                        </div>
                      </div>

                      <div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/orders/${ord.id}`)}
                          className="w-full md:w-auto text-xs py-1.5 flex items-center justify-center gap-1 bg-white"
                        >
                          View Details
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>

                    {/* Horizontal Tracker Row */}
                    {ord.status !== 'cancelled' ? (
                      <div className="pt-2 border-t border-secondary200/50">
                        <OrderStatusTracker status={ord.status} layout="horizontal" />
                      </div>
                    ) : (
                      <div className="pt-3 border-t border-secondary200/50 flex items-center gap-2">
                        <span className="bg-rose-100 text-rose-800 text-[10px] font-bold px-2.5 py-0.5 rounded uppercase tracking-wider">
                          Cancelled
                        </span>
                        <p className="text-xs text-secondary500">
                          This order has been cancelled and cannot be tracked.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>

          <Pagination
            page={pagination.page}
            totalPages={pagination.totalPages}
            onPageChange={(pageVal) => setPage(pageVal)}
          />
        </div>
      )}
    </div>
  )
}

export default OrderHistory
