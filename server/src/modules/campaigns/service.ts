import { adminSupabase } from '../../lib/supabase/admin';
import { AppError } from '../../types';
import type { SalesCampaign } from '../../types';
import type { CreateCampaignInput, UpdateCampaignInput } from './schema';

export async function getActiveCampaigns(): Promise<SalesCampaign[]> {
  const now = new Date().toISOString();
  const { data, error } = await adminSupabase
    .from('sales_campaigns')
    .select('*')
    .eq('is_active', true)
    .lte('starts_at', now)
    .gte('ends_at', now)
    .order('starts_at', { ascending: false });

  if (error) throw new AppError(500, 'DB_ERROR', 'Failed to fetch campaigns');
  return (data as SalesCampaign[]) ?? [];
}

export async function adminListCampaigns(): Promise<SalesCampaign[]> {
  const { data, error } = await adminSupabase
    .from('sales_campaigns')
    .select('*')
    .order('starts_at', { ascending: false });

  if (error) throw new AppError(500, 'DB_ERROR', 'Failed to fetch campaigns');
  return (data as SalesCampaign[]) ?? [];
}

export async function adminListCampaignsPaginated(
  page: number,
  limit: number,
): Promise<{ data: SalesCampaign[]; total: number; page: number; limit: number; totalPages: number }> {
  const offset = (page - 1) * limit;

  const { data, error, count } = await adminSupabase
    .from('sales_campaigns')
    .select('*', { count: 'exact' })
    .order('starts_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw new AppError(500, 'DB_ERROR', 'Failed to fetch campaigns');
  return {
    data: (data as SalesCampaign[]) ?? [],
    total: count ?? 0,
    page,
    limit,
    totalPages: Math.ceil((count ?? 0) / limit),
  };
}

export async function createCampaign(input: CreateCampaignInput): Promise<SalesCampaign> {
  const { data, error } = await adminSupabase
    .from('sales_campaigns')
    .insert(input)
    .select()
    .single();

  if (error) throw new AppError(500, 'DB_ERROR', 'Failed to create campaign');
  return data as SalesCampaign;
}

export async function updateCampaign(id: string, input: UpdateCampaignInput): Promise<SalesCampaign> {
  const { data, error } = await adminSupabase
    .from('sales_campaigns')
    .update(input)
    .eq('id', id)
    .select()
    .single();

  if (error || !data) throw new AppError(404, 'CAMPAIGN_NOT_FOUND', 'Campaign not found');
  return data as SalesCampaign;
}

export async function toggleCampaign(id: string): Promise<SalesCampaign> {
  const { data: existing } = await adminSupabase
    .from('sales_campaigns')
    .select('is_active')
    .eq('id', id)
    .single();

  if (!existing) throw new AppError(404, 'CAMPAIGN_NOT_FOUND', 'Campaign not found');

  const { data, error } = await adminSupabase
    .from('sales_campaigns')
    .update({ is_active: !existing.is_active })
    .eq('id', id)
    .select()
    .single();

  if (error || !data) throw new AppError(500, 'DB_ERROR', 'Failed to toggle campaign');
  return data as SalesCampaign;
}
