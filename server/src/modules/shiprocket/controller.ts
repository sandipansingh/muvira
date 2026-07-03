import type { Request, Response, NextFunction } from 'express'
import * as service from './service'
import {
  getPickupLocations,
  checkServiceability,
} from '../../services/shiprocket'
import { getSettings, updateSettings } from '../settings/service'
import {
  computePayloadHash,
  verifyWebhookAuth,
  checkWebhookDuplicate,
  recordWebhookEvent,
} from './webhookSecurity'
import {
  recordWebhookReceived,
  recordWebhookProcessed,
  recordWebhookFailed,
  recordWebhookDuplicate,
} from '../../services/metricsCollector'
import { logger } from '../../lib/logger'

/**
 * POST /api/webhooks/shiprocket
 *
 * Webhook endpoint for Shiprocket tracking updates.
 *
 * Security:
 * - Raw body is preserved by app.ts middleware
 * - Optional shared-secret verification via query param ?secret= or header
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
      res.status(422).json({ success: false, error: { code: 'EMPTY_BODY', message: 'Empty request body' } })
      return
    }

    const payloadHash = computePayloadHash(rawBody)
    const correlationId = req.requestId ?? payloadHash
    logger.info({ correlationId }, 'Shiprocket webhook: processing started')

    const parsedBody = JSON.parse(rawBody.toString('utf8')) as Record<string, unknown>

    // 1. Auth check
    const querySecret = req.query['secret'] as string | undefined
    const headerSig = req.headers['x-shiprocket-signature'] as string | undefined

    if (!verifyWebhookAuth(querySecret, headerSig)) {
      recordWebhookFailed()
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Invalid webhook secret' },
      })
      return
    }

    // 2. Idempotency check
    const existing = await checkWebhookDuplicate(payloadHash)
    if (existing) {
      logger.info({ payloadHash, existingStatus: existing.processing_status }, 'Duplicate Shiprocket webhook')
      recordWebhookDuplicate()
      await recordWebhookEvent({
        source: 'shiprocket',
        eventType: (parsedBody['event'] as string) ?? null,
        payloadHash,
        rawPayload: parsedBody,
        processingStatus: 'duplicate',
      })
      // Return 200 so Shiprocket stops retrying
      res.json({ success: true, data: { status: 'duplicate' } })
      return
    }

    // 3. Record receipt
    recordWebhookReceived()
    const eventId = await recordWebhookEvent({
      source: 'shiprocket',
      eventType: (parsedBody['event'] as string) ?? null,
      payloadHash,
      rawPayload: parsedBody,
      processingStatus: 'verified',
    })

    // 4. Process
    try {
      const result = await service.processShiprocketWebhook(parsedBody)

      recordWebhookProcessed()
      if (eventId) {
        await recordWebhookEvent({
          source: 'shiprocket',
          eventType: (parsedBody['event'] as string) ?? null,
          payloadHash,
          rawPayload: parsedBody,
          processingStatus: 'processed',
        })
      }

      res.json({ success: true, data: { status: result.status, orderId: result.orderId } })
    } catch (processingErr) {
      recordWebhookFailed()
      const errorMsg = processingErr instanceof Error ? processingErr.message : String(processingErr)

      if (eventId) {
        await recordWebhookEvent({
          source: 'shiprocket',
          eventType: (parsedBody['event'] as string) ?? null,
          payloadHash,
          rawPayload: parsedBody,
          processingStatus: 'failed',
          errorMessage: errorMsg,
        })
      }

      // Return 500 so Shiprocket retries
      res.status(500).json({
        success: false,
        error: { code: 'PROCESSING_FAILED', message: errorMsg },
      })
    }
  } catch (err) {
    // JSON parse error or other pre-processing failure
    // 4xx = client error, Shiprocket won't retry
    logger.error({ err }, 'Shiprocket webhook pre-processing failed')
    res.status(422).json({
      success: false,
      error: { code: 'MALFORMED_WEBHOOK', message: 'Invalid webhook payload' },
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
