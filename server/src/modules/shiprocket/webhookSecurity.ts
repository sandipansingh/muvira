import { createHash } from 'crypto'
import { timingSafeEqual } from 'crypto'
import { env } from '../../config/env'
import { adminSupabase } from '../../lib/supabase/admin'

/**
 * Compute SHA-256 hash of a raw webhook payload Buffer.
 * Used as an idempotency key to detect duplicate deliveries.
 */
export function computePayloadHash(rawBody: Buffer): string {
  return createHash('sha256').update(rawBody).digest('hex')
}

/** Verify the vendor API key without allowing an unauthenticated fallback. */
export function verifyWebhookAuth(apiKey?: string): boolean {
  if (env.SHIPROCKET_WEBHOOK_ENABLED !== 'true') {
    return false
  }

  const expectedSecret = env.SHIPROCKET_WEBHOOK_SECRET

  if (!expectedSecret) {
    return false
  }

  const candidate = apiKey ?? ''
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
  const { data, error } = await adminSupabase
    .from('webhook_events')
    .select('id, processing_status')
    .eq('payload_hash', payloadHash)
    .maybeSingle()

  if (error) throw new Error(`Failed to check webhook idempotency: ${error.message}`)
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
}): Promise<string> {
  const { data, error } = await adminSupabase
    .from('webhook_events')
    .insert({
      source: params.source,
      event_type: params.eventType ?? null,
      payload_hash: params.payloadHash,
      raw_payload: params.rawPayload,
      processing_status: params.processingStatus,
      error_message: params.errorMessage ?? null,
      processed_at: null,
    })
    .select('id')
    .single()

  if (error || !data) {
    throw new Error(`Failed to record webhook event: ${error?.message ?? 'missing row'}`)
  }

  return data.id
}

/**
 * Update the processing status of an existing webhook event.
 */
export async function updateWebhookEventStatus(
  eventId: string,
  status: 'verified' | 'processed' | 'failed',
  errorMessage?: string | null
): Promise<void> {
  const { data, error } = await adminSupabase
    .from('webhook_events')
    .update({
      processing_status: status,
      error_message: errorMessage ?? null,
      processed_at: status === 'processed' || status === 'failed' ? new Date().toISOString() : null,
    })
    .eq('id', eventId)
    .select('id')
    .single()

  if (error || !data) {
    throw new Error(`Failed to update webhook event: ${error?.message ?? 'missing row'}`)
  }
}
