import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { adminApiService } from '../../lib/api/admin';
import type { OrderDetail } from '../../types/order';
import { formatPrice, formatDate } from '../../lib/format';
import Card, { CardContent } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table';
import Select from '../../components/ui/Select';
import Pagination from '../../components/ui/Pagination';
import Skeleton from '../../components/ui/Skeleton';
import ErrorState from '../../components/shared/ErrorState';
import { Search, RefreshCw } from 'lucide-react';
import { useToast } from '../../hooks/useToast';

export const OrdersList: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [orders, setOrders] = useState<OrderDetail[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { showToast } = useToast();

  const handleSyncTracking = async () => {
    setSyncing(true);
    const res = await adminApiService.syncTrackingOrders();
    setSyncing(false);
    if (res.success) {
      showToast(
        `Sync completed. Checked ${res.data.totalChecked} active shipments, updated ${res.data.totalUpdated} statuses.`,
        'success'
      );
      fetchOrders();
    } else {
      showToast(res.error.message || 'Tracking sync failed.', 'error');
    }
  };

  // Sync inputs with URL params
  const q = searchParams.get('q') || '';
  const status = searchParams.get('status') || '';
  const paymentStatus = searchParams.get('paymentStatus') || '';
  const fulfillmentStatus = searchParams.get('fulfillmentStatus') || '';
  const page = parseInt(searchParams.get('page') || '1', 10);

  useEffect(() => {
    fetchOrders();
  }, [q, status, paymentStatus, fulfillmentStatus, page]);

  const fetchOrders = async () => {
    setLoading(true);
    setError(null);

    const queryParams: any = {
      page,
      limit: 10,
      q,
    };

    if (status) queryParams.status = status;
    if (paymentStatus) queryParams.paymentStatus = paymentStatus;
    if (fulfillmentStatus) queryParams.fulfillmentStatus = fulfillmentStatus;

    const res = await adminApiService.getOrders(queryParams);
    if (res.success) {
      setOrders(res.data);
      setPagination(res.pagination);

      // Silent background tracking sync for any active/transit shipments on this page
      const activeOrders = res.data.filter(
        (o) => o.awbCode && o.status !== 'delivered' && o.status !== 'cancelled'
      );
      if (activeOrders.length > 0) {
        adminApiService.syncTrackingOrders().then((syncRes) => {
          if (syncRes.success && syncRes.data.totalUpdated > 0) {
            // Re-fetch list silently since some statuses were updated
            adminApiService.getOrders(queryParams).then((reRes) => {
              if (reRes.success) {
                setOrders(reRes.data);
                setPagination(reRes.pagination);
              }
            });
          }
        });
      }
    } else {
      setError(res.error.message || 'Failed to load orders list.');
    }
    setLoading(false);
  };

  const updateParam = (key: string, value: string) => {
    const updated = new URLSearchParams(searchParams);
    if (value === '') {
      updated.delete(key);
    } else {
      updated.set(key, value);
    }
    if (key !== 'page') {
      updated.delete('page');
    }
    setSearchParams(updated);
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

  const getPaymentVariant = (pStatus: string) => {
    switch (pStatus) {
      case 'paid':
        return 'success';
      case 'failed':
        return 'danger';
      default:
        return 'warning';
    }
  };

  const orderStatusOptions = [
    { value: '', label: 'All Order Statuses' },
    { value: 'pending', label: 'Pending' },
    { value: 'confirmed', label: 'Confirmed' },
    { value: 'processing', label: 'Processing' },
    { value: 'shipped', label: 'Shipped' },
    { value: 'delivered', label: 'Delivered' },
    { value: 'cancelled', label: 'Cancelled' },
  ];

  const paymentStatusOptions = [
    { value: '', label: 'All Payments' },
    { value: 'pending', label: 'Pending' },
    { value: 'paid', label: 'Paid' },
    { value: 'failed', label: 'Failed' },
    { value: 'refunded', label: 'Refunded' },
  ];

  const fulfillmentStatusOptions = [
    { value: '', label: 'All Fulfillments' },
    { value: 'unfulfilled', label: 'Unfulfilled' },
    { value: 'partial', label: 'Partial' },
    { value: 'fulfilled', label: 'Fulfilled' },
  ];

  return (
    <div className="space-y-6 font-instrument text-left">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold tracking-wide text-darkColor">
            Order Management
          </h2>
          <p className="text-xs text-secondary500 tracking-wide mt-1">
            Fulfill order packages, assign carriers tracking details, and moderate custom request notes.
          </p>
        </div>
        <button
          onClick={handleSyncTracking}
          disabled={syncing}
          className="shrink-0 text-xs py-2 px-4 rounded-lg bg-darkColor text-white font-medium hover:bg-opacity-90 disabled:opacity-50 transition-all flex items-center gap-2 justify-center"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'Syncing...' : 'Sync Tracking'}
        </button>
      </div>

      {/* Filters */}
      <Card className="border border-secondary200">
        <CardContent className="p-4 grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
          {/* Query search */}
          <div className="relative flex items-center">
            <input
              type="text"
              placeholder="Search order #, customer..."
              value={q}
              onChange={(e) => updateParam('q', e.target.value)}
              className="w-full h-9 pl-9 pr-4 text-xs border border-secondary300 rounded-lg text-darkColor placeholder-secondary400 focus:outline-none focus:border-primaryBg"
            />
            <Search className="absolute left-3 w-4 h-4 text-secondary400" />
          </div>

          {/* Status */}
          <Select
            options={orderStatusOptions}
            value={status}
            onChange={(e) => updateParam('status', e.target.value)}
            className="!py-1.5 !text-xs border-secondary300"
          />

          {/* Payment */}
          <Select
            options={paymentStatusOptions}
            value={paymentStatus}
            onChange={(e) => updateParam('paymentStatus', e.target.value)}
            className="!py-1.5 !text-xs border-secondary300"
          />

          {/* Fulfillment */}
          <Select
            options={fulfillmentStatusOptions}
            value={fulfillmentStatus}
            onChange={(e) => updateParam('fulfillmentStatus', e.target.value)}
            className="!py-1.5 !text-xs border-secondary300"
          />
        </CardContent>
      </Card>

      {/* TABLE */}
      <Card className="border border-secondary200 shadow-sm">
        <CardContent className="p-0">
          {error ? (
            <ErrorState message={error} onRetry={fetchOrders} />
          ) : loading ? (
            <div className="p-5 space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-10 text-xs md:text-sm text-secondary500">
              No orders matching filters found.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order Reference</TableHead>
                  <TableHead>Customer Details</TableHead>
                  <TableHead>Payable (₹)</TableHead>
                  <TableHead>Placed Date</TableHead>
                  <TableHead>Order Status</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Fulfillment</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((ord) => (
                  <TableRow key={ord.id}>
                    <TableCell className="font-medium text-darkColor font-instrument">
                      {ord.orderNumber}
                    </TableCell>
                    <TableCell>
                      <p className="font-medium text-darkColor leading-none">{ord.customer?.fullName}</p>
                      <p className="text-[10px] text-secondary500 font-medium font-instrument mt-1">
                        {ord.customer?.email}
                      </p>
                    </TableCell>
                    <TableCell className="font-medium text-secondary700">
                      {formatPrice(ord.totalAmount)}
                    </TableCell>
                    <TableCell className="text-xs font-normal text-secondary600 font-instrument">
                      {formatDate(ord.createdAt)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(ord.status)}>{ord.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getPaymentVariant(ord.paymentStatus)}>
                        {ord.paymentStatus}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={ord.fulfillmentStatus === 'fulfilled' ? 'success' : 'warning'}>
                        {ord.fulfillmentStatus}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <button
                        onClick={() => navigate(`/admin/orders/${ord.id}`)}
                        className="text-xs text-secondary600 hover:text-darkColor font-medium py-1 px-2 transition-colors"
                      >
                        Fulfill
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Pagination
        page={pagination.page}
        totalPages={pagination.totalPages}
        onPageChange={(pageVal) => updateParam('page', pageVal.toString())}
      />
    </div>
  );
};

export default OrdersList;
