import type { Request, Response, NextFunction } from 'express'
import * as service from './service'
import { invalidateOn } from '../../services/cacheInvalidation'
import type { ListOrdersQuery, AdminListOrdersQuery } from './schema'

export async function listOrders(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const query = req.query as unknown as ListOrdersQuery
    const result = await service.listUserOrders(req.user!.id, query)
    res.json({
      success: true,
      data: result.orders,
      meta: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    })
  } catch (err) {
    next(err)
  }
}

export async function getOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const order = await service.getUserOrder(req.user!.id, req.params['id'] as string)
    res.json({ success: true, data: order })
  } catch (err) {
    next(err)
  }
}

export async function getOrderTracking(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const data = await service.getOrderTracking(req.user!.id, req.params['id'] as string)
    res.json({ success: true, data })
  } catch (err) {
    next(err)
  }
}

export async function adminListOrders(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const query = req.query as unknown as AdminListOrdersQuery
    const result = await service.adminListOrders(query)
    res.json({
      success: true,
      data: result.orders,
      meta: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    })
  } catch (err) {
    next(err)
  }
}

export async function adminGetOrder(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const order = await service.adminGetOrder(req.params['id'] as string)
    res.json({ success: true, data: order })
  } catch (err) {
    next(err)
  }
}

export async function adminUpdateStatus(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const order = await service.adminUpdateOrderStatus(req.params['id'] as string, req.body)

    invalidateOn('ORDER_UPDATED', {
      id: order.id,
      userId: order.user_id,
    })

    res.json({ success: true, data: order })
  } catch (err) {
    next(err)
  }
}

export async function adminUpdateFulfillment(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const order = await service.adminUpdateFulfillment(req.params['id'] as string, req.body)

    invalidateOn('ORDER_UPDATED', {
      id: order.id,
      userId: order.user_id,
    })

    res.json({ success: true, data: order })
  } catch (err) {
    next(err)
  }
}

export async function adminAddNote(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const order = await service.adminAddOrderNote(req.params['id'] as string, req.body)

    invalidateOn('ORDER_UPDATED', {
      id: order.id,
      userId: order.user_id,
    })

    res.json({ success: true, data: order })
  } catch (err) {
    next(err)
  }
}

export async function adminSyncTracking(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const result = await service.adminSyncTrackingOrders()
    res.json({ success: true, data: result })
  } catch (err) {
    next(err)
  }
}

export async function adminAssignAwb(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const order = await service.adminAssignAwb(req.params['id'] as string, req.body)
    invalidateOn('ORDER_UPDATED', { id: order.id, userId: order.user_id })
    res.json({ success: true, data: order })
  } catch (err) {
    next(err)
  }
}

export async function adminSchedulePickup(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const result = await service.adminSchedulePickup(req.params['id'] as string)
    res.json({ success: true, data: result })
  } catch (err) {
    next(err)
  }
}

export async function adminGenerateLabel(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const pdf = await service.adminGenerateLabel(req.params['id'] as string)
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename=label-${req.params['id']}.pdf`)
    res.send(pdf)
  } catch (err) {
    next(err)
  }
}

export async function adminGenerateManifest(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const pdf = await service.adminGenerateManifest(req.params['id'] as string)
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename=manifest-${req.params['id']}.pdf`)
    res.send(pdf)
  } catch (err) {
    next(err)
  }
}

export async function adminGenerateInvoice(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const pdf = await service.adminGenerateInvoice(req.params['id'] as string)
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename=invoice-${req.params['id']}.pdf`)
    res.send(pdf)
  } catch (err) {
    next(err)
  }
}

export async function adminCancelShiprocketOrder(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const result = await service.adminCancelShiprocketOrder(req.params['id'] as string)
    res.json({ success: true, data: result })
  } catch (err) {
    next(err)
  }
}

export async function adminCancelShiprocketShipment(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const result = await service.adminCancelShiprocketShipment(req.params['id'] as string)
    res.json({ success: true, data: result })
  } catch (err) {
    next(err)
  }
}

export async function adminRetryShiprocket(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const orderId = req.params['id'] as string
    await service.createShiprocketOrder(orderId)
    const order = await service.adminGetOrder(orderId)
    res.json({ success: true, data: order })
  } catch (err) {
    next(err)
  }
}

export async function adminCreateShipment(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const orderId = req.params['id'] as string
    const order = await service.adminCreateShipment(orderId, req.body['pickup_location'] as string)
    res.json({ success: true, data: order })
  } catch (err) {
    next(err)
  }
}

export async function adminFulfillOrder(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const orderId = req.params['id'] as string
    const result = await service.adminFulfillOrder(orderId, req.body)
    if (result.success) {
      res.json({ success: true, data: result })
    } else {
      res
        .status(502)
        .json({
          success: false,
          data: result,
          error: { code: 'FULFILLMENT_FAILED', message: result.error ?? 'Fulfillment failed' },
        })
    }
  } catch (err) {
    next(err)
  }
}
