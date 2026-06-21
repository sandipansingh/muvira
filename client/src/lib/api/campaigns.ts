import { api } from './client';
import { mapCampaign } from './adapters';
import type { Campaign } from '../../types/campaign';
import type { ApiResponse } from '../../types/common';

export const campaignsApiService = {
  async getActiveCampaigns(): Promise<ApiResponse<Campaign[]>> {
    const res = await api.get<{
      success: boolean;
      data?: Record<string, unknown>[];
      error?: { code: string; message: string };
    }>('/api/campaigns/active');

    if (!res.success || !res.data) {
      return { success: true, data: [] };
    }

    return { success: true, data: res.data.map(mapCampaign) };
  },
};
