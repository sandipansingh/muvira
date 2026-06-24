import { api } from './client';
import { mapSiteSettings } from './adapters';
import type { SiteSettings } from '../../types/settings';
import type { ApiResponse } from '../../types/common';

type RawSettingsResponse = {
  success: boolean;
  data?: Record<string, unknown>;
  error?: { code: string; message: string };
};

export const settingsApiService = {
  async getSettings(): Promise<ApiResponse<SiteSettings>> {
    const res = await api.get<RawSettingsResponse>('/api/settings');
    if (!res.success || !res.data) {
      return { success: false, error: { code: 'FETCH_ERROR', message: 'Failed to load settings' } };
    }
    return { success: true, data: mapSiteSettings(res.data) };
  },

  async adminUpdateSettings(patch: Partial<{
    contact_info: SiteSettings['contactInfo'];
    announcement_bar: SiteSettings['announcementBar'];
    hero_slides: SiteSettings['heroSlides'];
  }>): Promise<ApiResponse<SiteSettings>> {
    const res = await api.patch<RawSettingsResponse>('/api/admin/settings', patch, true);
    if (!res.success || !res.data) {
      return { success: false, error: { code: 'UPDATE_ERROR', message: 'Failed to update settings' } };
    }
    return { success: true, data: mapSiteSettings(res.data) };
  },
};
