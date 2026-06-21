import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ordersMockService } from '../../mocks/orders.mock';
import type { OrderListItem } from '../../types/order';
import { formatPrice, formatDate } from '../../lib/format';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Card, { CardContent } from '../../components/ui/Card';
import Pagination from '../../components/ui/Pagination';
import Skeleton from '../../components/ui/Skeleton';
import Breadcrumb from '../../components/layout/Breadcrumb';
import EmptyState from '../../components/shared/EmptyState';
import ErrorState from '../../components/shared/ErrorState';
import { History, ArrowRight } from 'lucide-react';

export const OrderHistory: React.FC = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetchOrders();
  }, [page]);

  const fetchOrders = async () => {
    setLoading(true);
    setError(null);
    const res = await ordersMockService.getOrders(page, 10);
    if (res.success) {
      setOrders(res.data);
      setPagination(res.pagination);
    } else {
      setError(res.error.message || 'Failed to load order history');
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

  if (error) {
    return (
      <div className="max-w-[1240px] mx-auto px-6 py-8">
        <ErrorState message={error} onRetry={fetchOrders} />
      </div>
    );
  }

  return (
    <div className="max-w-[1240px] mx-auto px-6 py-6 font-redhat text-left">
      <Breadcrumb items={[{ label: 'Order History' }]} />

      <h1 className="text-xl md:text-2xl font-bold tracking-wide text-darkColor my-6">
        Order History
      </h1>

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="p-5 border border-secondary200 rounded-xl bg-white space-y-3">
              <div className="flex justify-between">
                <Skeleton className="h-5 w-36" />
                <Skeleton className="h-5 w-20" />
              </div>
              <Skeleton className="h-4 w-64" />
              <div className="flex gap-2">
                <Skeleton className="h-6 w-16 rounded-full" />
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      ) : orders.length === 0 ? (
        <EmptyState
          title="No Orders Found"
          description="You haven't placed any orders yet. Visit our collections to find premium designs."
          actionLabel="Go to Catalog"
          onAction={() => navigate('/products')}
          icon={<History className="w-12 h-12" />}
        />
      ) : (
        <div className="space-y-4">
          <div className="space-y-4">
            {orders.map((ord) => (
              <Card key={ord.id} className="border border-secondary200 shadow-xs hover:border-secondary400 transition-colors">
                <CardContent className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-5 text-left">
                  {/* Summary */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <Link
                        to={`/orders/${ord.id}`}
                        className="text-sm font-bold text-darkColor hover:text-primaryBg hover:underline"
                      >
                        {ord.orderNumber}
                      </Link>
                      <span className="text-xs text-secondary500 font-medium">
                        {formatDate(ord.createdAt)}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-xs font-medium text-secondary600">
                      <span>Items: <b>{ord.itemCount}</b></span>
                      <span>Total: <b className="text-darkColor">{formatPrice(ord.totalAmount)}</b></span>
                    </div>

                    {/* Status badges */}
                    <div className="flex items-center gap-2 pt-1">
                      <Badge variant={getStatusVariant(ord.status)}>{ord.status}</Badge>
                      <Badge variant={getPaymentVariant(ord.paymentStatus)}>
                        Payment: {ord.paymentStatus}
                      </Badge>
                      {ord.fulfillmentStatus !== 'unfulfilled' && (
                        <Badge variant="neutral">{ord.fulfillmentStatus}</Badge>
                      )}
                    </div>
                  </div>

                  {/* CTA button */}
                  <div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/orders/${ord.id}`)}
                      className="w-full md:w-auto text-xs py-1.5 flex items-center justify-center gap-1 bg-white"
                    >
                      View Details
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Pagination
            page={pagination.page}
            totalPages={pagination.totalPages}
            onPageChange={(pageVal) => setPage(pageVal)}
          />
        </div>
      )}
    </div>
  );
};

export default OrderHistory;
