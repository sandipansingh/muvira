import { adminSupabase } from '../../../lib/supabase/admin'
import { hasSchemaCapability } from '../../../services/runtimeSchema'
import { AppError } from '../../../types'
import type { AnalyticsPeriod, DashboardAnalytics } from '../../../types/adminAnalytics'

interface DashboardStats {
  total_orders: number
  orders_today: number
  total_revenue_paisa: number
  revenue_today_paisa: number
  total_products: number
  active_products: number
  total_categories: number
  active_coupons: number
  low_stock_count: number
  pending_orders: number
  confirmed_orders: number
}

export async function getDashboardStats(params: {
  from_date?: string
  to_date?: string
}): Promise<DashboardStats> {
  if (!(await hasSchemaCapability(52))) {
    throw new AppError(
      503,
      'SCHEMA_UPGRADE_REQUIRED',
      'Dashboard totals require database migration 052'
    )
  }
  const { data, error } = await adminSupabase.rpc('get_dashboard_stats', {
    p_from_date: params.from_date ?? null,
    p_to_date: params.to_date ?? null,
  })
  if (error || !data)
    throw new AppError(
      503,
      'DASHBOARD_UNAVAILABLE',
      'Dashboard metrics are temporarily unavailable'
    )
  return data as DashboardStats
}

export async function getDashboardAnalytics(period: AnalyticsPeriod): Promise<DashboardAnalytics> {
  if (!(await hasSchemaCapability(57))) {
    throw new AppError(
      503,
      'SCHEMA_UPGRADE_REQUIRED',
      'Revenue reporting requires database migration 057'
    )
  }
  const { data, error } = await adminSupabase.rpc('get_dashboard_analytics', { p_period: period })
  if (error || !data) {
    throw new AppError(503, 'DASHBOARD_UNAVAILABLE', 'Revenue reporting is temporarily unavailable')
  }
  return data as DashboardAnalytics
}
