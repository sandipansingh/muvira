import type { Request, Response, NextFunction } from 'express'
import * as service from './service'
import { getMetricsSnapshot } from '../../../services/metricsCollector'
import { getBreakerStatus } from '../../../services/circuitBreaker'

export async function getSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await service.getDashboardSummary()
    res.json({ success: true, data })
  } catch (err) {
    next(err)
  }
}

export async function getShipmentHealth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const data = await service.getShipmentHealth()
    res.json({ success: true, data })
  } catch (err) {
    next(err)
  }
}

export async function getSyncHealth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const data = await service.getSyncHealth()
    res.json({ success: true, data })
  } catch (err) {
    next(err)
  }
}

export async function getWebhookLogs(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const page = parseInt(req.query['page'] as string) || 1
    const limit = Math.min(parseInt(req.query['limit'] as string) || 20, 100)
    const source = req.query['source'] as string | undefined
    const status = req.query['status'] as string | undefined
    const result = await service.getWebhookLogs({ page, limit, source, status })
    res.json({ success: true, data: result.logs, meta: { page, limit, total: result.total } })
  } catch (err) {
    next(err)
  }
}

export async function getRetryQueue(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const page = parseInt(req.query['page'] as string) || 1
    const limit = Math.min(parseInt(req.query['limit'] as string) || 20, 100)
    const status = req.query['status'] as string | undefined
    const result = await service.getRetryQueue({ page, limit, status })
    res.json({ success: true, data: result.jobs, meta: { page, limit, total: result.total } })
  } catch (err) {
    next(err)
  }
}

export async function retryJob(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const jobId = req.params['id'] as string
    const ok = await service.retryJob(jobId)
    if (!ok) {
      res
        .status(404)
        .json({
          success: false,
          error: { code: 'JOB_NOT_FOUND', message: 'Job not found or not in retryable state' },
        })
      return
    }
    res.json({ success: true, data: { retried: true } })
  } catch (err) {
    next(err)
  }
}

export async function getShiprocketErrors(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const page = parseInt(req.query['page'] as string) || 1
    const limit = Math.min(parseInt(req.query['limit'] as string) || 20, 100)
    const result = await service.getShiprocketErrors({ page, limit })
    res.json({ success: true, data: result.errors, meta: { page, limit, total: result.total } })
  } catch (err) {
    next(err)
  }
}

export async function getCourierPerformance(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const data = await service.getCourierPerformance()
    res.json({ success: true, data })
  } catch (err) {
    next(err)
  }
}

export async function getMetrics(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = getMetricsSnapshot()
    res.json({ success: true, data })
  } catch (err) {
    next(err)
  }
}

export async function refreshShipment(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const orderId = req.params['orderId'] as string
    const result = await service.refreshSingleShipment(orderId)
    res.json({ success: true, data: result })
  } catch (err) {
    next(err)
  }
}

export async function getCircuitBreaker(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const data = getBreakerStatus()
    res.json({ success: true, data })
  } catch (err) {
    next(err)
  }
}
