import type { Request, Response, NextFunction } from 'express'
import * as service from './service'
import type { DashboardStatsQuery } from './schema'

export async function getDashboardStats(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const query = req.query as unknown as DashboardStatsQuery
    const stats = await service.getDashboardStats({
      from_date: query.from_date,
      to_date: query.to_date,
    })
    res.json({ success: true, data: stats })
  } catch (err) {
    next(err)
  }
}
