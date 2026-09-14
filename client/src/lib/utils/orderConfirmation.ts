import type { OrderDetail } from '../types/order'

export function isVerifiedPaidOrder(order: OrderDetail): boolean {
  return order.paymentStatus === 'paid'
}

export function orderConfirmationError(
  orderId: string | null,
  order: OrderDetail | null,
  requestError: string | null
): string | null {
  if (!orderId) return 'No order reference was provided.'
  if (requestError) return requestError
  if (!order) return 'Order confirmation is unavailable.'
  if (!isVerifiedPaidOrder(order)) return 'This order does not have a verified paid status.'
  return null
}
