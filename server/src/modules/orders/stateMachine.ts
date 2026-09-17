/**
 * Order State Machine
 *
 * Defines all valid order status transitions and Shiprocket status mappings.
 * Every status update MUST pass through isValidTransition() before being applied.
 *
 * Terminal states (no exit transitions): cancelled, delivered, returned, refunded, lost, damaged
 */

export const ORDER_STATUSES = [
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
] as const

export type OrderStatus = (typeof ORDER_STATUSES)[number]

/**
 * Valid transitions.
 *
 * Each key lists ALL states that this status can legally transition to.
 * Transitions NOT in this map are rejected with an error.
 *
 * Rules:
 * - Terminal states have empty sets (no exit)
 * - Admin manual overrides are handled separately (logged, not rejected)
 * - Auto-sync (webhook/polling) MUST respect these transitions
 */
export const VALID_TRANSITIONS: Record<OrderStatus, ReadonlySet<OrderStatus>> = {
  pending: new Set<OrderStatus>(['confirmed', 'cancelled']),
  confirmed: new Set<OrderStatus>(['processing', 'cancelled']),
  processing: new Set<OrderStatus>(['shipped', 'cancelled']),
  shipped: new Set<OrderStatus>(['out_for_delivery', 'delivered', 'rto', 'lost', 'damaged']),
  out_for_delivery: new Set<OrderStatus>(['delivered', 'delivery_failed', 'rto']),
  delivered: new Set<OrderStatus>(['returned']),
  cancelled: new Set<OrderStatus>([]), // terminal
  rto: new Set<OrderStatus>(['returned']),
  returned: new Set<OrderStatus>(['refunded']),
  refunded: new Set<OrderStatus>([]), // terminal
  lost: new Set<OrderStatus>([]), // terminal
  damaged: new Set<OrderStatus>([]), // terminal
  delivery_failed: new Set<OrderStatus>(['out_for_delivery', 'rto']),
}

/**
 * Check whether a transition from oldStatus to newStatus is valid.
 */
export function isValidTransition(from: string, to: string): boolean {
  const validTargets = VALID_TRANSITIONS[from as OrderStatus]
  if (!validTargets) return false
  return validTargets.has(to as OrderStatus)
}

/**
 * Whether a status is terminal (cannot transition further).
 */
export function isTerminalStatus(status: string): boolean {
  const targets = VALID_TRANSITIONS[status as OrderStatus]
  return targets !== undefined && targets.size === 0
}

/**
 * Exact mapping from Shiprocket tracking status to our OrderStatus.
 *
 * Uses normalized (lowercase + trimmed) exact match against known Shiprocket
 * status strings. Unknown statuses return null (silently ignored).
 *
 * Precedence: more specific matches come first.
 */
export function shiprocketStatusToOrderStatus(srStatus?: string): OrderStatus | null {
  if (!srStatus) return null

  const s = srStatus.toLowerCase().trim()
  const words = s.replace(/[-_]+/g, ' ').replace(/\s+/g, ' ')

  // --- RTO states ---
  if (s.includes('rto')) {
    if (s.includes('delivered')) return 'returned'
    return 'rto'
  }

  // --- Delivery failures (must precede positive delivered matches) ---
  if (
    words === 'undelivered' ||
    words.includes('not delivered') ||
    words.includes('delivery failed') ||
    words.includes('failed delivery') ||
    words.includes('delivery unsuccessful') ||
    words === 'exception'
  ) {
    return 'delivery_failed'
  }

  // --- Terminal states ---
  if (words === 'delivered' || /\bdelivered\b/.test(words)) return 'delivered'
  if (s === 'cancelled' || s === 'cancelled before shipping') return 'cancelled'
  if (s === 'lost') return 'lost'
  if (s === 'damaged') return 'damaged'

  // --- Delivery states ---
  if (s === 'out for delivery' || s.includes('out for delivery')) return 'out_for_delivery'
  // --- In transit ---
  if (
    s === 'shipped' ||
    s.includes('in transit') ||
    s.includes('transit') ||
    s.includes('reached') ||
    s.includes('arrived at hub') ||
    s === 'picked up' ||
    s.includes('picked up')
  ) {
    return 'shipped'
  }

  // --- Pre-transit (processing) ---
  if (
    s === 'new' ||
    s.includes('awb') ||
    s.includes('pickup') ||
    s.includes('manifest') ||
    s.includes('label') ||
    s.includes('scheduled') ||
    s.includes('generated') ||
    s === 'ready' ||
    s.includes('ready')
  ) {
    return 'processing'
  }

  return null
}
