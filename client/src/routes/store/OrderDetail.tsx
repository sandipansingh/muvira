import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ordersApiService } from "../../lib/api/orders";
import type { OrderDetail as OrderDetailType } from "../../types/order";
import { formatPrice, formatDate } from "../../lib/format";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import Card, { CardContent } from "../../components/ui/Card";
import Skeleton from "../../components/ui/Skeleton";
import Breadcrumb from "../../components/layout/Breadcrumb";
import ErrorState from "../../components/shared/ErrorState";
import { MapPin, Truck, ArrowLeft, FileText } from "lucide-react";

export const OrderDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<OrderDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchOrderDetails();
    }
  }, [id]);

  const fetchOrderDetails = async () => {
    setLoading(true);
    setError(null);
    const res = await ordersApiService.getOrderById(id || "");
    if (res.success) {
      setOrder(res.data);
    } else {
      setError(res.error.message || "Order not found.");
    }
    setLoading(false);
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "delivered":
        return "success";
      case "cancelled":
        return "danger";
      case "shipped":
      case "processing":
      case "confirmed":
        return "primary";
      default:
        return "warning";
    }
  };

  const getPaymentVariant = (pStatus: string) => {
    switch (pStatus) {
      case "paid":
        return "success";
      case "failed":
        return "danger";
      default:
        return "warning";
    }
  };

  if (error) {
    return (
      <div className="max-w-[1240px] mx-auto px-6 py-8">
        <ErrorState message={error} onRetry={fetchOrderDetails} />
      </div>
    );
  }

  return (
    <div className="max-w-[1240px] mx-auto px-6 py-6 font-instrument text-left">
      <Breadcrumb
        items={[
          { label: "Order History", path: "/orders" },
          { label: order?.orderNumber || "Order Details" },
        ]}
      />

      <div className="flex items-center gap-3 my-6">
        <Button
          variant="ghost"
          size="sm"
          pill={true}
          onClick={() => navigate("/orders")}
          className="border border-secondary300 bg-white p-2"
        >
          <ArrowLeft className="w-4.5 h-4.5" />
        </Button>
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-wide text-darkColor">
            {order?.orderNumber}
          </h1>
          <p className="text-xs text-secondary500 font-medium tracking-wide mt-0.5">
            Placed on {order && formatDate(order.createdAt)}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-40 rounded-xl" />
            <Skeleton className="h-40 rounded-xl" />
          </div>
          <Skeleton className="h-64 rounded-xl" />
        </div>
      ) : !order ? (
        <ErrorState message="Could not fetch order data." />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* LEFT: PRODUCTS LIST & STATUS LOGS */}
          <div className="lg:col-span-2 space-y-6">
            {/* Products Card */}
            <Card className="border border-secondary200">
              <div className="p-5 border-b border-secondary200 bg-lightgrayColor/30">
                <h3 className="text-sm font-bold text-darkColor uppercase tracking-widest flex items-center gap-2">
                  <FileText className="w-4.5 h-4.5 text-primaryBg" />
                  Order Items
                </h3>
              </div>
              <CardContent className="p-5 divide-y divide-secondary200/50 space-y-4">
                {order.items.map((item, idx) => (
                  <div
                    key={item.id}
                    className={`flex gap-4 ${idx > 0 ? "pt-4" : ""}`}
                  >
                    <div className="w-16 h-16 md:w-20 md:h-20 bg-lightgrayColor rounded-lg border border-secondary200 overflow-hidden shrink-0">
                      <img
                        src={item.productImage}
                        alt={item.productName}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-grow flex justify-between items-start text-left gap-4">
                      <div>
                        <h4 className="text-xs md:text-sm font-semibold text-darkColor leading-snug">
                          {item.productName}
                        </h4>
                        <span className="text-[10px] text-secondary500 uppercase tracking-widest font-semibold block mt-1">
                          Unit Price: {formatPrice(item.unitPrice)}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-secondary600 font-semibold block">
                          Qty: {item.quantity}
                        </span>
                        <span className="text-xs md:text-sm font-bold text-darkColor block mt-1">
                          {formatPrice(item.totalPrice)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Shipment Status & Tracking */}
            <Card className="border border-secondary200">
              <div className="p-5 border-b border-secondary200 bg-lightgrayColor/30">
                <h3 className="text-sm font-bold text-darkColor uppercase tracking-widest flex items-center gap-2">
                  <Truck className="w-4.5 h-4.5 text-primaryBg" />
                  Shipment & Logistics
                </h3>
              </div>
              <CardContent className="p-5 text-left space-y-4">
                <div className="grid grid-cols-2 gap-4 text-xs md:text-sm">
                  <div>
                    <span className="text-secondary500 block">
                      Fulfillment Status
                    </span>
                    <span className="font-semibold text-darkColor capitalize">
                      {order.fulfillmentStatus}
                    </span>
                  </div>
                  <div>
                    <span className="text-secondary500 block">
                      Delivery Partner
                    </span>
                    <span className="font-semibold text-darkColor">
                      {order.carrierName || "Preparing for Shipping"}
                    </span>
                  </div>
                  {order.trackingId && (
                    <div className="col-span-2 bg-lightgrayColor p-3.5 border border-secondary200 rounded-xl space-y-1">
                      <span className="text-secondary500 text-[10px] uppercase font-bold tracking-widest">
                        Tracking Number
                      </span>
                      <p className="text-sm font-bold text-primaryBg font-instrument leading-none">
                        {order.trackingId}
                      </p>
                      <p className="text-[10px] text-secondary500 mt-1 leading-snug">
                        Use the tracking ID on {order.carrierName}'s website to
                        monitor your packages.
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* RIGHT: BILLING BREAKDOWN & ADDRESS */}
          <div className="space-y-6">
            {/* Payment Summary */}
            <Card className="border border-secondary200 shadow-sm">
              <div className="p-5 border-b border-secondary200 bg-lightgrayColor/30">
                <h3 className="text-sm font-bold text-darkColor uppercase tracking-widest">
                  Billing Breakdown
                </h3>
              </div>
              <CardContent className="p-5 space-y-4">
                {/* Envelop details */}
                <div className="space-y-2.5 text-xs md:text-sm border-b border-secondary200 pb-4">
                  <div className="flex justify-between text-secondary600">
                    <span>Cart Subtotal</span>
                    <span className="font-semibold text-darkColor">
                      {formatPrice(order.subtotal)}
                    </span>
                  </div>
                  {order.discountAmount > 0 && (
                    <div className="flex justify-between text-emerald-700 font-semibold">
                      <span>Discount ({order.couponCode})</span>
                      <span>-{formatPrice(order.discountAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-secondary600">
                    <span>Shipping Charges</span>
                    <span className="text-emerald-700 font-semibold uppercase">
                      Free
                    </span>
                  </div>
                  <div className="flex justify-between text-secondary500 text-xs">
                    <span>Tax & GST</span>
                    <span>₹0</span>
                  </div>
                </div>

                {/* Final Total */}
                <div className="flex justify-between items-center text-darkColor font-bold py-1">
                  <span className="text-sm uppercase tracking-wider">
                    Total Amount
                  </span>
                  <span className="text-sm md:text-lg text-primaryBg">
                    {formatPrice(order.totalAmount)}
                  </span>
                </div>

                {/* Payment Status Badges */}
                <div className="border-t border-secondary200 pt-4 flex gap-2 justify-center">
                  <Badge variant={getStatusVariant(order.status)}>
                    {order.status}
                  </Badge>
                  <Badge variant={getPaymentVariant(order.paymentStatus)}>
                    {order.paymentStatus}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Delivery address destination */}
            <Card className="border border-secondary200">
              <div className="p-5 border-b border-secondary200 bg-lightgrayColor/30">
                <h3 className="text-sm font-bold text-darkColor uppercase tracking-widest flex items-center gap-2">
                  <MapPin className="w-4.5 h-4.5 text-primaryBg" />
                  Delivery Destination
                </h3>
              </div>
              <CardContent className="p-5 text-left text-xs md:text-sm">
                <p className="font-bold text-darkColor mb-1">
                  {order.shippingAddress.fullName}
                </p>
                <p className="text-secondary600 mb-1.5 leading-snug">
                  {order.shippingAddress.line1},{" "}
                  {order.shippingAddress.line2 &&
                    `${order.shippingAddress.line2}, `}
                  {order.shippingAddress.city}, {order.shippingAddress.state} -{" "}
                  {order.shippingAddress.pincode}
                </p>
                <p className="font-semibold text-secondary700 font-instrument">
                  {order.shippingAddress.phone}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderDetail;
