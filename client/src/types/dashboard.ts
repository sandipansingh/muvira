export interface DashboardStats {
  totalOrders: number;
  totalRevenue: number; // in paisa
  totalProducts: number;
  totalCategories: number;
  activeCoupons: number;
  lowStockCount: number;
}

export interface InventoryItem {
  productId: string;
  productName: string;
  sku: string;
  stock: number;
  isLowStock: boolean;
}
