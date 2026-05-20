import { Router } from 'express';
import { validate } from '../../middleware/validate';
import { CampaignIdParamsSchema, CreateCampaignSchema, UpdateCampaignSchema } from './schema';
import * as controller from './controller';

export const campaignsRouter = Router();
campaignsRouter.get('/active', controller.getActiveCampaigns);

export const adminCampaignsRouter = Router();
adminCampaignsRouter.get('/', controller.adminListCampaigns);
adminCampaignsRouter.post('/', validate({ body: CreateCampaignSchema }), controller.adminCreateCampaign);
adminCampaignsRouter.patch('/:id', validate({ params: CampaignIdParamsSchema, body: UpdateCampaignSchema }), controller.adminUpdateCampaign);
adminCampaignsRouter.post('/:id/toggle', validate({ params: CampaignIdParamsSchema }), controller.adminToggleCampaign);
