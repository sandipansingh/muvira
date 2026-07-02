import { api } from './client'
import { mapOrderListItem, mapOrderDetail } from './adapters'
import type {
  OrderListItem,
  OrderDetail,
  ShiprocketTrackData,
  OrderTrackingData,
} from '../../types/order'
import type { ApiPaginatedResponse, ApiResponse } from '../../types/common'

interface CreateOrderResult {
  orderId: string
  orderNumber: string
  razorpayOrderId: string
  razorpayKeyId: string
  amount: number
  currency: string
  subtotal: number
  discountAmount: number
  shippingAmount: number
  totalAmount: number
}

interface VerifyPaymentResult {
  verified: boolean
  orderId: string
  orderNumber: string
  status: string
  paymentStatus: string
}

export const ordersApiService = {
  async createOrder(
    addressId: string,
    couponCode: string | null,
    notes: string | null = null
  ): Promise<ApiResponse<CreateOrderResult>> {
    const body: Record<string, unknown> = { address_id: addressId }
    if (couponCode) body['coupon_code'] = couponCode
    if (notes) body['notes'] = notes

    const res = await api.post<{
      success: boolean
      data?: Record<string, unknown>
      error?: { code: string; message: string }
    }>('/api/checkout/create-order', body, true)

    if (!res.success || !res.data) {
      return {
        success: false,
        error: res.error ?? {
          code: 'UNKNOWN',
          message: 'Failed to create order',
        },
      }
    }

    const d = res.data
    const orderData = d['order'] as Record<string, unknown> | undefined
    return {
      success: true,
      data: {
        orderId: (orderData?.['id'] as string) ?? '',
        orderNumber: (orderData?.['order_number'] as string) ?? '',
        razorpayOrderId: d['razorpay_order_id'] as string,
        razorpayKeyId: d['key_id'] as string,
        amount: d['amount_paisa'] as number,
        currency: d['currency'] as string,
        subtotal: (orderData?.['subtotal_paisa'] as number) ?? 0,
        discountAmount: (orderData?.['discount_amount_paisa'] as number) ?? 0,
        shippingAmount: (orderData?.['shipping_amount_paisa'] as number) ?? 0,
        totalAmount: d['amount_paisa'] as number,
      },
    }
  },
  async verifyPayment(
    razorpayOrderId: string,
    razorpayPaymentId: string,
    razorpaySignature: string
  ): Promise<ApiResponse<VerifyPaymentResult>> {
    const res = await api.post<{
      success: boolean
      data?: Record<string, unknown>
      error?: { code: string; message: string }
    }>(
      '/api/payments/verify',
      {
        razorpay_order_id: razorpayOrderId,
        razorpay_payment_id: razorpayPaymentId,
        razorpay_signature: razorpaySignature,
      },
      true
    )

    if (!res.success || !res.data) {
      return {
        success: false,
        error: res.error ?? {
          code: 'PAYMENT_FAILED',
          message: 'Payment verification failed',
        },
      }
    }

    return {
      success: true,
      data: {
        verified: true,
        orderId: res.data['order_id'] as string,
        orderNumber: res.data['order_number'] as string,
        status: res.data['status'] as string,
        paymentStatus: res.data['payment_status'] as string,
      },
    }
  },

  async getOrders(page = 1, limit = 20): Promise<ApiPaginatedResponse<OrderListItem>> {
    const res = await api.get<{
      success: boolean
      data?: Record<string, unknown>[]
      meta?: { page: number; limit: number; total: number; totalPages: number }
      error?: { code: string; message: string }
    }>(`/api/orders?page=${page}&limit=${limit}`, true)

    if (!res.success || !res.data) {
      return {
        success: false,
        error: res.error ?? {
          code: 'UNKNOWN',
          message: 'Failed to fetch orders',
        },
      }
    }

    return {
      success: true,
      data: res.data.map(mapOrderListItem),
      pagination: {
        page: res.meta?.page ?? page,
        limit: res.meta?.limit ?? limit,
        total: res.meta?.total ?? 0,
        totalPages: res.meta?.totalPages ?? 1,
      },
    }
  },

  async getOrderById(id: string): Promise<ApiResponse<OrderDetail>> {
    const res = await api.get<{
      success: boolean
      data?: Record<string, unknown>
      error?: { code: string; message: string }
    }>(`/api/orders/${encodeURIComponent(id)}`, true)

    if (!res.success || !res.data) {
      return {
        success: false,
        error: res.error ?? { code: 'NOT_FOUND', message: 'Order not found' },
      }
    }

    return { success: true, data: mapOrderDetail(res.data) }
  },

  async trackOrder(awb: string): Promise<ApiResponse<ShiprocketTrackData>> {
    const res = await api.get<{
      success: boolean
      data?: Record<string, unknown>
      error?: { code: string; message: string }
    }>(`/api/tracking/${encodeURIComponent(awb)}`, false)

    if (!res.success || !res.data) {
      return {
        success: false,
        error: res.error ?? { code: 'TRACK_FAILED', message: 'Failed to fetch tracking' },
      }
    }

    const trackingData = res.data['tracking_data'] as Record<string, unknown> | undefined
    return {
      success: true,
      data: trackingData as unknown as ShiprocketTrackData,
    }
  },

  async getOrderTracking(id: string): Promise<ApiResponse<OrderTrackingData>> {
    const res = await api.get<{
      success: boolean
      data?: Record<string, unknown>
      error?: { code: string; message: string }
    }>(`/api/orders/${encodeURIComponent(id)}/tracking`, true)

    if (!res.success || !res.data) {
      return {
        success: false,
        error: res.error ?? { code: 'TRACK_FAILED', message: 'Failed to fetch tracking' },
      }
    }

    return { success: true, data: res.data as unknown as OrderTrackingData }
  },
}
