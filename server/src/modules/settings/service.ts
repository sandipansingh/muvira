import { adminSupabase } from '../../lib/supabase/admin';
import { AppError } from '../../types';
import type { UpdateSettingsInput } from './schema';

export interface SiteSettings {
  contact_info: {
    email: string;
    phone: string;
    address: string;
  };
  announcement_bar: {
    enabled: boolean;
    badge: string;
    message: string;
  };
  hero_slides: Array<{
    id: string;
    title: string;
    subtitle: string;
    imageUrl: string;
    link: string;
  }>;
}

const SETTING_KEYS = ['contact_info', 'announcement_bar', 'hero_slides'] as const;

export async function getSettings(): Promise<SiteSettings> {
  const { data, error } = await adminSupabase
    .from('site_settings')
    .select('key, value')
    .in('key', SETTING_KEYS);

  if (error) throw new AppError(500, 'DB_ERROR', 'Failed to fetch site settings');

  const map: Record<string, unknown> = {};
  for (const row of data ?? []) {
    map[row.key] = row.value;
  }

  return {
    contact_info: (map['contact_info'] as SiteSettings['contact_info']) ?? {
      email: '',
      phone: '',
      address: '',
    },
    announcement_bar: (map['announcement_bar'] as SiteSettings['announcement_bar']) ?? {
      enabled: false,
      badge: '',
      message: '',
    },
    hero_slides: (map['hero_slides'] as SiteSettings['hero_slides']) ?? [],
  };
}

export async function updateSettings(input: UpdateSettingsInput): Promise<SiteSettings> {
  const updates = Object.entries(input).map(([key, value]) => ({
    key,
    value,
    updated_at: new Date().toISOString(),
  }));

  for (const update of updates) {
    const { error } = await adminSupabase
      .from('site_settings')
      .upsert(update, { onConflict: 'key' });

    if (error) throw new AppError(500, 'DB_ERROR', `Failed to update setting: ${update.key}`);
  }

  return getSettings();
}
