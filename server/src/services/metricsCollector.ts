/**
 * In-Memory Metrics Collector
 *
 * Lightweight counters and gauges for operational observability.
 * All counters are resettable and accessible via the diagnostics API.
 *
 * For production: replace with Prometheus/OpenTelemetry.
 */

interface MetricsState {
  sync: {
    fullPolls: number
    ofdPolls: number
    ordersSyncedTotal: number
    syncErrorsTotal: number
    lastSyncAt: string | null
    lastSyncDurationMs: number | null
  }
  webhook: {
    received: number
    processed: number
    failed: number
    duplicate: number
    lastReceivedAt: string | null
  }
  shiprocketApi: {
    callsTotal: number
    callsFailedTotal: number
    callsRetriedTotal: number
    callsTimedOutTotal: number
    lastCallDurationMs: number | null
  }
  orderEvents: {
    emittedTotal: number
    deliveredTotal: number
    shippedTotal: number
    cancelledTotal: number
    rtoTotal: number
  }
}

const metrics: MetricsState = {
  sync: {
    fullPolls: 0,
    ofdPolls: 0,
    ordersSyncedTotal: 0,
    syncErrorsTotal: 0,
    lastSyncAt: null,
    lastSyncDurationMs: null,
  },
  webhook: {
    received: 0,
    processed: 0,
    failed: 0,
    duplicate: 0,
    lastReceivedAt: null,
  },
  shiprocketApi: {
    callsTotal: 0,
    callsFailedTotal: 0,
    callsRetriedTotal: 0,
    callsTimedOutTotal: 0,
    lastCallDurationMs: null,
  },
  orderEvents: {
    emittedTotal: 0,
    deliveredTotal: 0,
    shippedTotal: 0,
    cancelledTotal: 0,
    rtoTotal: 0,
  },
}

export function getMetrics(): MetricsState {
  return { ...metrics }
}

export function getMetricsSnapshot() {
  const m = getMetrics()
  return {
    ...m,
    server_uptime_seconds: Math.floor(process.uptime()),
    memory_mb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024 * 10) / 10,
    node_env: process.env.NODE_ENV ?? 'unknown',
  }
}

// --- Sync Metrics ---

export function recordFullPoll(ordersChecked: number, ordersUpdated: number, durationMs: number): void {
  metrics.sync.fullPolls++
  metrics.sync.ordersSyncedTotal += ordersUpdated
  metrics.sync.lastSyncAt = new Date().toISOString()
  metrics.sync.lastSyncDurationMs = durationMs
}

export function recordOfdPoll(ordersChecked: number, ordersUpdated: number, durationMs: number): void {
  metrics.sync.ofdPolls++
  metrics.sync.ordersSyncedTotal += ordersUpdated
  metrics.sync.lastSyncAt = new Date().toISOString()
  metrics.sync.lastSyncDurationMs = durationMs
}

export function recordSyncError(): void {
  metrics.sync.syncErrorsTotal++
}

// --- Webhook Metrics ---

export function recordWebhookReceived(): void {
  metrics.webhook.received++
  metrics.webhook.lastReceivedAt = new Date().toISOString()
}

export function recordWebhookProcessed(): void {
  metrics.webhook.processed++
}

export function recordWebhookFailed(): void {
  metrics.webhook.failed++
}

export function recordWebhookDuplicate(): void {
  metrics.webhook.duplicate++
}

// --- Shiprocket API Metrics ---

export function recordShiprocketCall(durationMs: number): void {
  metrics.shiprocketApi.callsTotal++
  metrics.shiprocketApi.lastCallDurationMs = durationMs
}

export function recordShiprocketCallFailed(): void {
  metrics.shiprocketApi.callsFailedTotal++
}

export function recordShiprocketCallRetried(): void {
  metrics.shiprocketApi.callsRetriedTotal++
}

export function recordShiprocketCallTimedOut(): void {
  metrics.shiprocketApi.callsTimedOutTotal++
}

// --- Order Event Metrics ---

export function recordOrderEvent(event: string): void {
  metrics.orderEvents.emittedTotal++
  switch (event) {
    case 'order:delivered': metrics.orderEvents.deliveredTotal++; break
    case 'order:shipped': metrics.orderEvents.shippedTotal++; break
    case 'order:cancelled': metrics.orderEvents.cancelledTotal++; break
    case 'order:rto:initiated': metrics.orderEvents.rtoTotal++; break
  }
}
