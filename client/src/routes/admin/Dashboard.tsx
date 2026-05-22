import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { adminMockService } from '../../mocks/admin.mock';
import type { DashboardStats } from '../../types/dashboard';
import type { OrderDetail } from '../../types/order';
import { formatPrice } from '../../lib/format';
import Card, { CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Skeleton from '../../components/ui/Skeleton';
import ErrorState from '../../components/shared/ErrorState';
import {
  DollarSign,
  ShoppingBag,
  Box,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  FolderTree
} from 'lucide-react';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentOrders, setRecentOrders] = useState<OrderDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    const [statsRes, ordersRes] = await Promise.all([
      adminMockService.getDashboardStats(),
      adminMockService.getOrders({ page: 1, limit: 5 }),
    ]);

    if (statsRes.success && ordersRes.success) {
      setStats(statsRes.data);
      setRecentOrders(ordersRes.data);
    } else {
      setError('Failed to load dashboard metrics.');
    }
    setLoading(false);
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'delivered':
        return 'success';
      case 'cancelled':
        return 'danger';
      case 'shipped':
      case 'processing':
      case 'confirmed':
        return 'primary';
      default:
        return 'warning';
    }
  };

  if (error) {
    return <ErrorState message={error} onRetry={fetchDashboardData} />;
  }

  return (
    <div className="space-y-6 font-redhat">
      {/* Title Header */}
      <div className="text-left">
        <h2 className="text-xl md:text-2xl font-medium tracking-wide text-darkColor">
          Administrative Dashboard
        </h2>
        <p className="text-xs text-secondary500 tracking-wide mt-1">
          Real-time metrics, store revenues, order fulfillments, and stock alerts.
        </p>
      </div>

      {loading ? (
        // Loading skeletons for stats cards
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : (
        stats && (
          /* STATS CARDS */
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Revenue */}
            <Card className="border border-secondary200">
              <CardContent className="p-5 flex items-center justify-between text-left">
                <div className="space-y-1">
                  <span className="text-[10px] md:text-xs font-medium text-secondary500 uppercase tracking-wider block">
                    Total Revenue
                  </span>
                  <span className="text-sm md:text-lg font-medium text-darkColor block">
                    {formatPrice(stats.totalRevenue)}
                  </span>
                  <span className="text-[9px] font-medium text-secondary500 flex items-center gap-0.5 mt-1 leading-none">
                    <TrendingUp className="w-3 h-3 text-secondary400" /> Live confirmed
                  </span>
                </div>
                <div className="text-secondary600 shrink-0">
                  <DollarSign className="w-6 h-6" />
                </div>
              </CardContent>
            </Card>

            {/* Orders */}
            <Card className="border border-secondary200">
              <CardContent className="p-5 flex items-center justify-between text-left">
                <div className="space-y-1">
                  <span className="text-[10px] md:text-xs font-medium text-secondary500 uppercase tracking-wider block">
                    Total Orders
                  </span>
                  <span className="text-sm md:text-lg font-medium text-darkColor block">
                    {stats.totalOrders}
                  </span>
                  <span className="text-[9px] font-medium text-secondary500 block mt-1 leading-none">
                    All user accounts combined
                  </span>
                </div>
                <div className="text-secondary600 shrink-0">
                  <ShoppingBag className="w-6 h-6" />
                </div>
              </CardContent>
            </Card>

            {/* Products */}
            <Card className="border border-secondary200">
              <CardContent className="p-5 flex items-center justify-between text-left">
                <div className="space-y-1">
                  <span className="text-[10px] md:text-xs font-medium text-secondary500 uppercase tracking-wider block">
                    Designs / Catalog
                  </span>
                  <span className="text-sm md:text-lg font-medium text-darkColor block">
                    {stats.totalProducts}
                  </span>
                  <span className="text-[9px] font-medium text-secondary500 flex items-center gap-1 mt-1 leading-none">
                    <FolderTree className="w-3 h-3 text-secondary400" /> {stats.totalCategories} Categories
                  </span>
                </div>
                <div className="text-secondary600 shrink-0">
                  <Box className="w-6 h-6" />
                </div>
              </CardContent>
            </Card>

            {/* Low stock alerts */}
            <Card className="border border-secondary200">
              <CardContent className="p-5 flex items-center justify-between text-left">
                <div className="space-y-1">
                  <span className="text-[10px] md:text-xs font-medium text-secondary500 uppercase tracking-wider block">
                    Low Stock Alerts
                  </span>
                  <span className="text-sm md:text-lg font-medium text-darkColor block">
                    {stats.lowStockCount}
                  </span>
                  {stats.lowStockCount > 0 ? (
                    <Link
                      to="/admin/inventory"
                      className="text-[9px] font-medium text-secondary500 hover:text-darkColor flex items-center gap-0.5 mt-1 leading-none hover:underline"
                    >
                      <AlertTriangle className="w-3 h-3 text-secondary400" /> Restock catalog
                    </Link>
                  ) : (
                    <span className="text-[9px] font-medium text-secondary500 block mt-1 leading-none">
                      All inventory optimal
                    </span>
                  )}
                </div>
                <div className="shrink-0 text-secondary400">
                  <AlertTriangle className="w-6 h-6" />
                </div>
              </CardContent>
            </Card>

          </div>
        )
      )}

      {/* RECENT ORDERS TABLE */}
      <Card className="border border-secondary200 shadow-sm text-left">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent Orders</CardTitle>
            <CardDescription>Latest 5 transactions placed across the store</CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/admin/orders')}
            className="text-xs bg-white py-1.5 flex items-center gap-1"
          >
            Manage All
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-5 space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : recentOrders.length === 0 ? (
            <div className="text-center py-8 text-xs text-secondary500 tracking-wide">
              No orders found in the database.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Total Payable</TableHead>
                  <TableHead>Order Status</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentOrders.map((ord) => (
                  <TableRow key={ord.id}>
                    <TableCell className="font-medium text-secondary700 font-roboto">
                      {ord.orderNumber}
                    </TableCell>
                    <TableCell>
                      <p className="font-medium text-darkColor leading-none">{ord.customer?.fullName}</p>
                      <p className="text-[10px] text-secondary500 font-medium font-roboto mt-1">
                        {ord.customer?.phone}
                      </p>
                    </TableCell>
                    <TableCell className="font-medium text-secondary700">
                      {formatPrice(ord.totalAmount)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(ord.status)}>{ord.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={ord.paymentStatus === 'paid' ? 'success' : 'warning'}>
                        {ord.paymentStatus}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <button
                        onClick={() => navigate(`/admin/orders/${ord.id}`)}
                        className="text-xs text-secondary600 hover:text-darkColor font-medium py-1 px-2 transition-colors"
                      >
                        View Details
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
