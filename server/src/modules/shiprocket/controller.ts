import type { Request, Response, NextFunction } from 'express'
import { getPickupLocations, checkServiceability } from '../../services/shiprocket'
import { getSettings, updateSettings } from '../settings/service'
import { computePayloadHash, verifyWebhookAuth } from './webhookSecurity'
import { adminSupabase } from '../../lib/supabase/admin'
import { logger } from '../../lib/logger'
import { parseShiprocketWebhookPayload } from './service'

export async function handleWebhook(
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  if (
    !verifyWebhookAuth(
      typeof req.headers['x-api-key'] === 'string' ? req.headers['x-api-key'] : undefined
    )
  ) {
    res
      .status(401)
      .json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid webhook secret' } })
    return
  }
  let payload: Record<string, unknown>
  try {
    if (!req.rawBody?.length) throw new Error('Empty body')
    const parsed: unknown = JSON.parse(req.rawBody.toString('utf8'))
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
      throw new Error('Invalid payload')
    payload = parsed as Record<string, unknown>
    parseShiprocketWebhookPayload(payload)
  } catch {
    res.status(422).json({
      success: false,
      error: { code: 'MALFORMED_WEBHOOK', message: 'Invalid webhook payload' },
    })
    return
  }
  try {
    const { data, error } = await adminSupabase.rpc('accept_shipping_webhook', {
      p_payload_hash: computePayloadHash(req.rawBody!),
      p_payload: payload,
    })
    if (error || !data) throw new Error('Receipt transaction failed')
    res.status(200).json({
      success: true,
      data: {
        status:
          (data as { processing_status: string }).processing_status === 'processed'
            ? 'duplicate'
            : 'accepted',
      },
    })
  } catch {
    logger.error({ requestId: req.requestId }, 'Shiprocket receipt could not be persisted')
    res.status(503).json({
      success: false,
      error: { code: 'WEBHOOK_AUDIT_FAILED', message: 'Webhook could not be recorded safely' },
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
