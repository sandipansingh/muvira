import type { OrderStatus } from '../types/order'

/**
 * List of all valid Order statuses in the system.
 */
export const ORDER_STATUSES: OrderStatus[] = [
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
]

/**
 * Terminal order statuses that have no outgoing state transitions.
 */
export const TERMINAL_ORDER_STATUSES: ReadonlySet<OrderStatus> = new Set([
  'cancelled',
  'refunded',
  'lost',
  'damaged',
])

/**
 * Valid order state transition map.
 * Consolidated from server/src/modules/orders/stateMachine.ts
 */
export const VALID_ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['processing', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped: ['out_for_delivery', 'delivered', 'rto', 'lost', 'damaged'],
  out_for_delivery: ['delivered', 'delivery_failed', 'rto'],
  delivered: ['returned'],
  cancelled: [],
  rto: ['returned'],
  returned: ['refunded'],
  refunded: [],
  lost: [],
  damaged: [],
  delivery_failed: ['out_for_delivery', 'rto'],
}
