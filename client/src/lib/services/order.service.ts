import { api } from '../api/client'
import { mapOrderListItem, mapOrderDetail } from '../utils/adapters'
import type { OrderListItem, OrderDetail, OrderTrackingData } from '../types/order'
import type { ApiPaginatedResponse, ApiResponse } from '../types/common'
import type {
  CreateCheckoutOrderInput,
  CreateCheckoutOrderResult,
  VerifyPaymentResult,
} from '../../types/checkout'

/**
 * Order creation, payment verification, and order history API service.
 */
export const orderApiService = {
  /**
   * Creates a checkout order with selected address and coupon code.
   */
  async createOrder(
    input: CreateCheckoutOrderInput
  ): Promise<ApiResponse<CreateCheckoutOrderResult>> {
    const body = {
      address_id: input.addressId,
      shipping_method: input.shippingMethod,
      billing_same_as_shipping: input.billingSameAsShipping,
      ...(input.couponCode ? { coupon_code: input.couponCode } : {}),
      ...(input.notes ? { notes: input.notes } : {}),
      ...(input.billing
        ? {
            billing: {
              full_name: input.billing.fullName,
              address_line1: input.billing.line1,
              ...(input.billing.line2 ? { address_line2: input.billing.line2 } : {}),
              city: input.billing.city,
              state: input.billing.state,
              pincode: input.billing.pincode,
              country: input.billing.country,
              ...(input.billing.gstNumber ? { gst_number: input.billing.gstNumber } : {}),
            },
          }
        : {}),
    }

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
    return {
      success: true,
      data: {
        orderId: d['order_id'] as string,
        orderNumber: d['order_number'] as string,
        razorpayOrderId: d['razorpay_order_id'] as string,
        razorpayKeyId: d['key_id'] as string,
        amountPaisa: d['amount_paisa'] as number,
        currency: d['currency'] as string,
        expiresAt: d['expires_at'] as string,
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
        orderId: res.data['order_id'] as string,
        orderNumber: res.data['order_number'] as string,
        status: res.data['status'] as string,
        paymentStatus: res.data['payment_status'] as string,
        alreadyCaptured: res.data['already_captured'] as boolean,
      },
    }
  },

  async cancelCheckout(orderId: string): Promise<void> {
    await api.post('/api/checkout/cancel', { order_id: orderId }, true)
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
