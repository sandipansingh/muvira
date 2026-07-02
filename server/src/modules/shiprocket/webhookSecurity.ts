import { createHash } from 'crypto'
import { timingSafeEqual } from 'crypto'
import { env } from '../../config/env'
import { adminSupabase } from '../../lib/supabase/admin'
import { logger } from '../../lib/logger'

const REPLAY_WINDOW_MS = 5 * 60 * 1000 // 5 minutes

/**
 * Compute SHA-256 hash of a raw webhook payload Buffer.
 * Used as an idempotency key to detect duplicate deliveries.
 */
export function computePayloadHash(rawBody: Buffer): string {
  return createHash('sha256').update(rawBody).digest('hex')
}

/**
 * Check replay attack protection: webhook payload timestamp must be within
 * the allowed replay window. Rejects payloads older than 5 minutes.
 *
 * Returns true if the timestamp is within the valid window, false otherwise.
 * Returns true if no timestamp is found (Shiprocket may not always include it).
 */
export function verifyWebhookFreshness(rawPayload: Record<string, unknown>): boolean {
  const ts = rawPayload['timestamp'] ?? rawPayload['created_at'] ?? rawPayload['date']
  if (!ts) return true

  const eventTime = new Date(ts as string).getTime()
  if (Number.isNaN(eventTime)) return true

  const ageMs = Date.now() - eventTime
  if (ageMs < 0) return true // future timestamps (clock skew) — allow

  if (ageMs > REPLAY_WINDOW_MS) {
    logger.warn(
      { eventTime: ts, ageMs, maxAgeMs: REPLAY_WINDOW_MS },
      'Webhook: payload expired — possible replay attack'
    )
    return false
  }

  return true
}

/**
 * Verify the webhook signature or shared secret.
 *
 * Shiprocket does not currently sign webhooks with HMAC, so we support
 * two fallback verification modes:
 *
 * 1. Query param: SHIPROCKET_WEBHOOK_SECRET must match ?secret=<value> in URL
 * 2. Header: X-Shiprocket-Signature must match SHIPROCKET_WEBHOOK_SECRET
 *
 * If SHIPROCKET_WEBHOOK_SECRET is not configured, verification is skipped.
 * This allows dev environments to receive webhooks without authentication.
 *
 * Returns true if the webhook is authenticated OR if secret is not configured.
 */
export function verifyWebhookAuth(
  querySecret?: string,
  headerSignature?: string
): boolean {
  const expectedSecret = env.SHIPROCKET_WEBHOOK_SECRET

  if (!expectedSecret) {
    return true
  }

  const candidate = querySecret ?? headerSignature ?? ''
  if (!candidate) {
    return false
  }

  const secretBuffer = Buffer.from(expectedSecret, 'utf8')
  const candidateBuffer = Buffer.from(candidate, 'utf8')

  if (secretBuffer.length !== candidateBuffer.length) {
    return false
  }

  return timingSafeEqual(secretBuffer, candidateBuffer)
}

/**
 * Check whether a webhook payload has already been processed.
 *
 * Uses the SHA-256 hash of the raw body as an idempotency key.
 * Returns an existing event if found, null otherwise.
 */
export async function checkWebhookDuplicate(
  payloadHash: string
): Promise<{ id: string; processing_status: string } | null> {
  const { data } = await adminSupabase
    .from('webhook_events')
    .select('id, processing_status')
    .eq('payload_hash', payloadHash)
    .maybeSingle()

  return data ?? null
}

/**
 * Record a webhook event in the audit trail.
 *
 * Mutually exclusive statuses:
 * - 'duplicate' — payload already processed, no-op
 * - 'verified' — signature check passed (may be updated to 'processed' later)
 * - 'failed' — processing encountered an error (error_message must be set)
 */
export async function recordWebhookEvent(params: {
  source: 'shiprocket' | 'razorpay'
  eventType?: string | null
  payloadHash: string
  rawPayload: Record<string, unknown>
  processingStatus: 'received' | 'verified' | 'processed' | 'failed' | 'duplicate'
  errorMessage?: string | null
}): Promise<string | null> {
  try {
    const { data, error } = await adminSupabase
      .from('webhook_events')
      .upsert(
        {
          source: params.source,
          event_type: params.eventType ?? null,
          payload_hash: params.payloadHash,
          raw_payload: params.rawPayload,
          processing_status: params.processingStatus,
          error_message: params.errorMessage ?? null,
          processed_at:
            params.processingStatus === 'processed' ||
            params.processingStatus === 'failed' ||
            params.processingStatus === 'duplicate'
              ? new Date().toISOString()
              : null,
        },
        { onConflict: 'payload_hash' }
      )
      .select('id')
      .single()

    if (error) {
      logger.error({ error, payloadHash: params.payloadHash }, 'Failed to record webhook event')
      return null
    }

    return data?.id ?? null
  } catch (err) {
    logger.error({ err, payloadHash: params.payloadHash }, 'Exception recording webhook event')
    return null
  }
}

/**
 * Update the processing status of an existing webhook event.
 */
export async function updateWebhookEventStatus(
  eventId: string,
  status: 'verified' | 'processed' | 'failed',
  errorMessage?: string | null
): Promise<void> {
  await adminSupabase
    .from('webhook_events')
    .update({
      processing_status: status,
      error_message: errorMessage ?? null,
      processed_at: status === 'processed' || status === 'failed' ? new Date().toISOString() : null,
    })
    .eq('id', eventId)
}
