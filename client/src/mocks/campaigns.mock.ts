import { delay } from './delay';
import { MockDatabase } from './store';
import type { Campaign } from '../types/campaign';
import type { ApiResponse } from '../types/common';

export const campaignsMockService = {
  async getActiveCampaigns(): Promise<ApiResponse<Campaign[]>> {
    await delay(200);

    if (MockDatabase.getErrorToggles().simulateServerErrors) {
      return {
        success: false,
        error: { code: 'SERVER_ERROR', message: 'Simulated server error.' },
      };
    }

    const campaigns = MockDatabase.getCampaigns().filter((c) => {
      const now = new Date();
      const start = new Date(c.startDate);
      const end = new Date(c.endDate);
      return c.isActive && now >= start && now <= end;
    });

    return {
      success: true,
      data: campaigns,
    };
  },
};
