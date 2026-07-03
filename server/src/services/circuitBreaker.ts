import { logger } from '../lib/logger'

/**
 * Circuit Breaker for Shiprocket API calls.
 *
 * Protects the Shiprocket API from being hammered when it's failing.
 * After `failureThreshold` consecutive failures, the breaker opens and
 * all subsequent calls fail fast for `cooldownMs`. After cooldown, one
 * trial call is allowed (half-open); if it succeeds, the breaker resets.
 *
 * Thread-safe for single-process use. Not safe across multiple Node processes
 * (use Redis for that).
 */

interface BreakerState {
  failures: number
  openedAt: number
  state: 'closed' | 'open' | 'half-open'
}

const FAILURE_THRESHOLD = 5
const COOLDOWN_MS = 60_000 // 1 minute

const state: BreakerState = {
  failures: 0,
  openedAt: 0,
  state: 'closed',
}

/**
 * Check whether a Shiprocket API call is allowed.
 * Returns true if allowed, false if the breaker is open.
 * Automatically transitions open → half-open after cooldown.
 */
export function canMakeShiprocketCall(): boolean {
  if (state.state === 'closed') return true

  if (state.state === 'open') {
    if (Date.now() - state.openedAt > COOLDOWN_MS) {
      state.state = 'half-open'
      logger.info('CircuitBreaker/Shiprocket: open -> half-open')
      return true
    }
    return false
  }

  // half-open: allow one trial call
  return true
}

/**
 * Report a successful Shiprocket API call.
 * Resets the breaker to closed state.
 */
export function reportShiprocketSuccess(): void {
  if (state.state !== 'closed') {
    logger.info('CircuitBreaker/Shiprocket: reset -> closed')
  }
  state.failures = 0
  state.state = 'closed'
}

/**
 * Report a failed Shiprocket API call.
 * Increments failure count; triggers open state if threshold exceeded.
 */
export function reportShiprocketFailure(): void {
  state.failures++

  if (state.state === 'half-open') {
    state.state = 'open'
    state.openedAt = Date.now()
    logger.warn(
      { failures: state.failures },
      'CircuitBreaker/Shiprocket: half-open trial failed -> open'
    )
    return
  }

  if (state.failures >= FAILURE_THRESHOLD) {
    state.state = 'open'
    state.openedAt = Date.now()
    logger.error(
      { failures: state.failures },
      'CircuitBreaker/Shiprocket: opened — too many consecutive failures'
    )
  }
}

/**
 * Get current circuit breaker status for diagnostics.
 */
export function getBreakerStatus(): {
  state: string
  failures: number
  openedAt: string | null
  cooldownRemainingMs: number | null
} {
  return {
    state: state.state,
    failures: state.failures,
    openedAt: state.state === 'open' ? new Date(state.openedAt).toISOString() : null,
    cooldownRemainingMs:
      state.state === 'open' ? Math.max(0, COOLDOWN_MS - (Date.now() - state.openedAt)) : null,
  }
}
