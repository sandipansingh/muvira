import type { Request, Response, NextFunction } from 'express'
import * as service from './service'
import {
  getPickupLocations,
  checkServiceability,
} from '../../services/shiprocket'
import { getSettings, updateSettings } from '../settings/service'
import { logger } from '../../lib/logger'

// Webhook - no auth
export async function handleWebhook(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const result = await service.processShiprocketWebhook(req.body)
    res.json({ success: true, data: { status: result.status } })
  } catch (err) {
    logger.error({ err }, 'Shiprocket webhook handler failed')
    res.json({ success: true, data: { status: 'error' } })
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
