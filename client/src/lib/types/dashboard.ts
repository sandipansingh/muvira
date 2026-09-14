/**
 * Admin Dashboard statistics and Inventory item types.
 */
export interface DashboardStats {
  totalOrders: number
  ordersToday: number
  totalRevenue: number // in paisa
  revenueToday: number
  totalProducts: number
  activeProducts: number
  totalCategories: number
  activeCoupons: number
  lowStockCount: number
  pendingOrders: number
  confirmedOrders: number
}

export interface InventoryItem {
  productId: string
  productName: string
  sku: string
  stock: number
  isLowStock: boolean
}
