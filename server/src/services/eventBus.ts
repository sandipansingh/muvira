import EventEmitter from 'events'
import { logger } from '../lib/logger'
import { recordOrderEvent } from './metricsCollector'
import type { OrderStatus } from '../modules/orders/stateMachine'

/**
 * Typed domain events emitted by the system.
 *
 * Event-driven architecture: Controllers/services emit events, subscribers
 * react asynchronously (fire-and-forget). This decouples core business logic
 * from side effects like notifications, cache invalidation, and analytics.
 */
export type OrderDomainEvent =
  | 'order:payment:captured'
  | 'order:status:changed'
  | 'order:shipped'
  | 'order:out-for-delivery'
  | 'order:delivered'
  | 'order:cancelled'
  | 'order:rto:initiated'
  | 'order:returned'
  | 'order:refunded'
  | 'order:delivery-failed'
  | 'order:lost'
  | 'order:damaged'

export interface OrderEventPayload {
  orderId: string
  orderNumber?: string
  userId: string
  oldStatus?: string
  newStatus: string
  source: 'webhook' | 'polling_sync' | 'admin_manual' | 'system'
  awbCode?: string | null
  courierName?: string | null
}

/**
 * In-process event bus built on Node.js EventEmitter.
 *
 * Design:
 * - Events are emitted synchronously but handlers run asynchronously.
 * - Each handler gets the event payload wrapped in a try/catch (errors logged).
 * - No backpressure — events are fire-and-forget.
 * - For production-grade reliability, swap this with Redis pub/sub or a queue.
 *
 * Usage:
 *   import { orderEvents, emitOrderEvent } from '../services/eventBus'
 *
 *   // Subscriber (register once during app init):
 *   orderEvents.on('order:status:changed', async (payload) => { ... })
 *
 *   // Publisher:
 *   emitOrderEvent('order:status:changed', { orderId, userId, ... })
 */
export const orderEvents = new EventEmitter()
orderEvents.setMaxListeners(50)

/**
 * Emit an order domain event.
 *
 * All listeners are invoked asynchronously. Failures in listeners are caught
 * and logged — they never propagate to the caller.
 */
export function emitOrderEvent(
  event: OrderDomainEvent,
  payload: OrderEventPayload
): void {
  setImmediate(() => {
    try {
      orderEvents.emit(event, payload)
    } catch (err) {
      logger.error({ err, event, orderId: payload.orderId }, 'EventBus: emit failed')
    }
  })
}

/**
 * Derive granular events from a status change.
 *
 * When an order transitions from oldStatus → newStatus, emit:
 * 1. 'order:status:changed' (generic — always fires)
 * 2. A granular event based on the NEW status (e.g. 'order:delivered')
 */
export function emitStatusChangeEvents(payload: OrderEventPayload): void {
  // Generic event — always
  emitOrderEvent('order:status:changed', payload)
  recordOrderEvent('order:status:changed')

  // Granular events based on new status
  const status = payload.newStatus as OrderStatus
  switch (status) {
    case 'shipped':
      emitOrderEvent('order:shipped', payload)
      break
    case 'out_for_delivery':
      emitOrderEvent('order:out-for-delivery', payload)
      break
    case 'delivered':
      emitOrderEvent('order:delivered', payload)
      break
    case 'cancelled':
      emitOrderEvent('order:cancelled', payload)
      break
    case 'rto':
      emitOrderEvent('order:rto:initiated', payload)
      break
    case 'returned':
      emitOrderEvent('order:returned', payload)
      break
    case 'refunded':
      emitOrderEvent('order:refunded', payload)
      break
    case 'delivery_failed':
      emitOrderEvent('order:delivery-failed', payload)
      break
    case 'lost':
      emitOrderEvent('order:lost', payload)
      break
    case 'damaged':
      emitOrderEvent('order:damaged', payload)
      break
  }
}
