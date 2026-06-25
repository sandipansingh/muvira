import type { Request, Response, NextFunction } from 'express';
import * as service from './service';

export async function getActiveCampaigns(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const campaigns = await service.getActiveCampaigns();
    res.json({ success: true, data: campaigns });
  } catch (err) { next(err); }
}

export async function adminListCampaigns(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const page = Math.max(1, parseInt((req.query['page'] as string) || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt((req.query['limit'] as string) || '10', 10)));

    const result = await service.adminListCampaignsPaginated(page, limit);
    res.json({
      success: true,
      data: result.data,
      meta: { page: result.page, limit: result.limit, total: result.total, totalPages: result.totalPages },
    });
  } catch (err) { next(err); }
}

export async function adminCreateCampaign(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const campaign = await service.createCampaign(req.body);
    res.status(201).json({ success: true, data: campaign });
  } catch (err) { next(err); }
}

export async function adminUpdateCampaign(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const campaign = await service.updateCampaign(req.params['id'] as string, req.body);
    res.json({ success: true, data: campaign });
  } catch (err) { next(err); }
}

export async function adminToggleCampaign(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const campaign = await service.toggleCampaign(req.params['id'] as string);
    res.json({ success: true, data: campaign });
  } catch (err) { next(err); }
}
