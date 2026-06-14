import { adminSupabase } from '../../../lib/supabase/admin'
import { AppError } from '../../../types'

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
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()

  // Parallel queries for performance
  const [
    ordersResult,
    ordersTodayResult,
    revenueResult,
    revenueTodayResult,
    productsResult,
    categoriesResult,
    activeCouponsResult,
    lowStockResult,
    pendingOrdersResult,
    confirmedOrdersResult,
  ] = await Promise.all([
    // Total orders (optionally filtered by date range)
    (() => {
      let q = adminSupabase.from('orders').select('id', { count: 'exact', head: true })
      if (params.from_date) q = q.gte('created_at', params.from_date)
      if (params.to_date) q = q.lte('created_at', params.to_date)
      return q
    })(),

    // Orders today
    adminSupabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', todayStart),

    // Total revenue (paid orders only) — sum of total_amount_paisa
    (() => {
      let q = adminSupabase.from('orders').select('total_amount_paisa').eq('payment_status', 'paid')
      if (params.from_date) q = q.gte('created_at', params.from_date)
      if (params.to_date) q = q.lte('created_at', params.to_date)
      return q
    })(),

    // Revenue today
    adminSupabase
      .from('orders')
      .select('total_amount_paisa')
      .eq('payment_status', 'paid')
      .gte('created_at', todayStart),

    // Products
    adminSupabase.from('products').select('id, is_active', { count: 'exact' }),

    // Categories
    adminSupabase
      .from('categories')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true),

    // Active coupons
    adminSupabase
      .from('coupons')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true),

    // Low stock (≤ 10 units)
    adminSupabase
      .from('products')
      .select('id', { count: 'exact', head: true })
      .lte('stock', 10)
      .eq('is_active', true),

    // Pending orders
    adminSupabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending'),

    // Confirmed orders
    adminSupabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'confirmed'),
  ])

  if (ordersResult.error) throw new AppError(500, 'DB_ERROR', 'Failed to fetch dashboard stats')

  // Sum revenue from rows
  const totalRevenuePaisa = (revenueResult.data ?? []).reduce(
    (sum: number, row: { total_amount_paisa: number }) => sum + row.total_amount_paisa,
    0
  )
  const revenueTodayPaisa = (revenueTodayResult.data ?? []).reduce(
    (sum: number, row: { total_amount_paisa: number }) => sum + row.total_amount_paisa,
    0
  )

  const activeProducts = (productsResult.data ?? []).filter(
    (p: { is_active: boolean }) => p.is_active
  ).length

  return {
    total_orders: ordersResult.count ?? 0,
    orders_today: ordersTodayResult.count ?? 0,
    total_revenue_paisa: totalRevenuePaisa,
    revenue_today_paisa: revenueTodayPaisa,
    total_products: productsResult.count ?? 0,
    active_products: activeProducts,
    total_categories: categoriesResult.count ?? 0,
    active_coupons: activeCouponsResult.count ?? 0,
    low_stock_count: lowStockResult.count ?? 0,
    pending_orders: pendingOrdersResult.count ?? 0,
    confirmed_orders: confirmedOrdersResult.count ?? 0,
  }
}
