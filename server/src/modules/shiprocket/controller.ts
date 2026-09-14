import type { Request, Response, NextFunction } from 'express'
import * as service from './service'
import { getPickupLocations, checkServiceability } from '../../services/shiprocket'
import { getSettings, updateSettings } from '../settings/service'
import {
  computePayloadHash,
  verifyWebhookAuth,
  checkWebhookDuplicate,
  recordWebhookEvent,
  updateWebhookEventStatus,
} from './webhookSecurity'
import {
  recordWebhookReceived,
  recordWebhookProcessed,
  recordWebhookFailed,
  recordWebhookDuplicate,
} from '../../services/metricsCollector'
import { logger } from '../../lib/logger'

/**
 * POST /api/webhooks/shipment-status
 *
 * Webhook endpoint for Shiprocket tracking updates.
 *
 * Security:
 * - Raw body is preserved by app.ts middleware
 * - Shared-secret verification through the vendor x-api-key header
 * - Payload SHA-256 hash used for idempotency (duplicates return 200 without reprocessing)
 *
 * HTTP semantics:
 * - 200: processed successfully (including duplicates)
 * - 401: signature verification failed (Shiprocket won't retry)
 * - 422: malformed payload (Shiprocket won't retry)
 * - 500: processing failure (Shiprocket WILL retry)
 */
export async function handleWebhook(
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  try {
    const rawBody = req.rawBody
    if (!rawBody || rawBody.length === 0) {
      res
        .status(422)
        .json({ success: false, error: { code: 'EMPTY_BODY', message: 'Empty request body' } })
      return
    }

    const payloadHash = computePayloadHash(rawBody)
    const correlationId = req.requestId ?? payloadHash
    logger.info({ correlationId }, 'Shiprocket webhook: processing started')

    const parsedBody = JSON.parse(rawBody.toString('utf8')) as Record<string, unknown>

    // 1. Auth check
    const apiKey = req.headers['x-api-key'] as string | undefined

    if (!verifyWebhookAuth(apiKey)) {
      recordWebhookFailed()
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Invalid webhook secret' },
      })
      return
    }

    // 2. Idempotency check. Carrier event timestamps are not delivery timestamps,
    // so replay protection is based on the authenticated payload hash instead.
    const existing = await checkWebhookDuplicate(payloadHash)
    if (existing && existing.processing_status !== 'failed') {
      logger.info(
        { payloadHash, existingStatus: existing.processing_status },
        'Duplicate Shiprocket webhook'
      )
      recordWebhookDuplicate()
      res.json({ success: true, data: { status: 'duplicate' } })
      return
    }

    // 3. Record receipt or reopen a previously failed attempt.
    recordWebhookReceived()
    const eventId = existing
      ? existing.id
      : await recordWebhookEvent({
          source: 'shiprocket',
          eventType:
            (parsedBody['current_status'] as string) ?? (parsedBody['event'] as string) ?? null,
          payloadHash,
          rawPayload: parsedBody,
          processingStatus: 'verified',
        })

    if (existing) {
      await updateWebhookEventStatus(eventId, 'verified')
    }

    // 4. Process
    try {
      const result = await service.processShiprocketWebhook(parsedBody)

      recordWebhookProcessed()
      await updateWebhookEventStatus(eventId, 'processed')

      res.json({ success: true, data: { status: result.status, orderId: result.orderId } })
    } catch (processingErr) {
      recordWebhookFailed()
      const errorMsg =
        processingErr instanceof Error ? processingErr.message : String(processingErr)

      await updateWebhookEventStatus(eventId, 'failed', errorMsg)

      // Return 500 so Shiprocket retries
      res.status(500).json({
        success: false,
        error: { code: 'PROCESSING_FAILED', message: errorMsg },
      })
    }
  } catch (err) {
    logger.error({ err }, 'Shiprocket webhook pre-processing failed')
    const malformed = err instanceof SyntaxError
    res.status(malformed ? 422 : 500).json({
      success: false,
      error: {
        code: malformed ? 'MALFORMED_WEBHOOK' : 'WEBHOOK_AUDIT_FAILED',
        message: malformed ? 'Invalid webhook payload' : 'Webhook could not be recorded safely',
      },
    })
  }
}

// Admin - pickup locations
export async function adminGetPickupLocations(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const locations = await getPickupLocations()
    res.json({ success: true, data: locations })
  } catch (err) {
    next(err)
  }
}

// Admin - check courier serviceability
export async function adminCheckServiceability(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const data = await checkServiceability(req.body)
    res.json({ success: true, data })
  } catch (err) {
    next(err)
  }
}

// Admin - get Shiprocket settings (from site_settings)
export async function adminGetShiprocketSettings(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const settings = await getSettings()
    res.json({ success: true, data: settings.shiprocket_settings })
  } catch (err) {
    next(err)
  }
}

// Admin - update Shiprocket settings (store in site_settings)
export async function adminUpdateShiprocketSettings(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const settings = await updateSettings({ shiprocket_settings: req.body })
    res.json({ success: true, data: settings.shiprocket_settings })
  } catch (err) {
    next(err)
  }
}
