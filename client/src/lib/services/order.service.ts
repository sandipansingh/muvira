import { api } from '../api/client'
import { mapOrderListItem, mapOrderDetail } from '../utils/adapters'
import type { OrderListItem, OrderDetail, OrderTrackingData } from '../types/order'
import type { ApiPaginatedResponse, ApiResponse } from '../types/common'

export interface CreateOrderResult {
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

export interface VerifyPaymentResult {
  verified: boolean
  orderId: string
  orderNumber: string
  status: string
  paymentStatus: string
}

/**
 * Order creation, payment verification, and order history API service.
 */
export const orderApiService = {
  /**
   * Creates a checkout order with selected address and coupon code.
   */
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
        error: res.error ?? { code: 'ORDER_CREATION_FAILED', message: 'Failed to create order' },
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

  /**
   * Submits custom S2S payment without launching Razorpay popup modal.
   */
  async payCustomOrder(
    addressId: string,
    couponCode: string | null,
    paymentPayload: Record<string, unknown>,
    notes: string | null = null
  ): Promise<ApiResponse<{ orderId: string; orderNumber: string }>> {
    const body: Record<string, unknown> = {
      address_id: addressId,
      ...paymentPayload,
    }
    if (couponCode) body['coupon_code'] = couponCode
    if (notes) body['notes'] = notes

    const res = await api.post<{
      success: boolean
      data?: { success: boolean; orderId: string; orderNumber: string }
      error?: { code: string; message: string }
    }>('/api/checkout/pay-custom', body, true)

    if (!res.success || !res.data) {
      return {
        success: false,
        error: res.error ?? { code: 'PAYMENT_FAILED', message: 'Payment failed' },
      }
    }

    return {
      success: true,
      data: {
        orderId: res.data.orderId,
        orderNumber: res.data.orderNumber,
      },
    }
  },

  /**
   * Verifies Razorpay payment signature after successful checkout modal payment.
   */
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
        error: res.error ?? { code: 'PAYMENT_FAILED', message: 'Payment verification failed' },
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

  /**
   * Fetches paginated order history for the authenticated user.
   */
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
        error: res.error ?? { code: 'FETCH_ORDERS_FAILED', message: 'Failed to fetch orders' },
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

  /**
   * Fetches detailed order information by order ID.
   */
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

  /**
   * Fetches tracking details for a specific order.
   */
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
