import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { adminApiService } from "../../lib/api/admin";
import type {
  OrderDetail,
  OrderStatus,
  FulfillmentStatus,
} from "../../types/order";
import { formatPrice, formatDate } from "../../lib/format";
import { useToast } from "../../hooks/useToast";
import Button from "../../components/ui/Button";
import Select from "../../components/ui/Select";
import Input from "../../components/ui/Input";
import Card, {
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/Card";
import LoadingSpinner from "../../components/shared/LoadingSpinner";
import ErrorState from "../../components/shared/ErrorState";
import { ArrowLeft, Phone, Mail } from "lucide-react";

export const AdminOrderDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { showToast } = useToast();

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Status updates state
  const [orderStatus, setOrderStatus] = useState<OrderStatus>("pending");
  const [fulfillmentStatus, setFulfillmentStatus] =
    useState<FulfillmentStatus>("unfulfilled");
  const [carrierName, setCarrierName] = useState("");
  const [trackingId, setTrackingId] = useState("");

  // Admin notes state
  const [noteText, setNoteText] = useState("");

  useEffect(() => {
    if (id) {
      fetchOrderDetails();
    }
  }, [id]);

  const fetchOrderDetails = async () => {
    setLoading(true);
    setError(null);
    const res = await adminApiService.getOrders({ page: 1, limit: 100 });
    if (res.success) {
      const match = res.data.find((o) => o.id === id);
      if (match) {
        setOrder(match);
        setOrderStatus(match.status);
        setFulfillmentStatus(match.fulfillmentStatus);
        setCarrierName(match.carrierName || "");
        setTrackingId(match.trackingId || "");
      } else {
        setError("Order not found.");
      }
    } else {
      setError(res.error.message || "Failed to fetch order.");
    }
    setLoading(false);
  };

  const handleUpdateStatus = async () => {
    if (!order) return;
    setSaving(true);
    const res = await adminApiService.updateOrderStatus(order.id, orderStatus);
    setSaving(false);

    if (res.success) {
      showToast("Order status updated successfully.", "success");
      setOrder(res.data);
    } else {
      showToast(res.error.message || "Status update failed.", "error");
    }
  };

  const handleUpdateFulfillment = async () => {
    if (!order) return;
    setSaving(true);
    const res = await adminApiService.updateOrderFulfillment(order.id, {
      fulfillmentStatus,
      carrierName,
      trackingId,
    });
    setSaving(false);

    if (res.success) {
      showToast("Fulfillment logistics updated.", "success");
      setOrder(res.data);
    } else {
      showToast(res.error.message || "Fulfillment update failed.", "error");
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteText.trim() || !order) return;

    setSaving(true);
    const res = await adminApiService.addOrderNote(order.id, noteText.trim());
    setSaving(false);

    if (res.success) {
      showToast("Internal note added.", "success");
      setNoteText("");
      setOrder(res.data);
    } else {
      showToast(res.error.message || "Failed to save note.", "error");
    }
  };

  const orderStatusOptions = [
    { value: "pending", label: "Pending" },
    { value: "confirmed", label: "Confirmed" },
    { value: "processing", label: "Processing" },
    { value: "shipped", label: "Shipped" },
    { value: "delivered", label: "Delivered" },
    { value: "cancelled", label: "Cancelled" },
  ];

  const fulfillmentStatusOptions = [
    { value: "unfulfilled", label: "Unfulfilled" },
    { value: "partial", label: "Partial" },
    { value: "fulfilled", label: "Fulfilled" },
  ];

  if (loading) {
    return <LoadingSpinner fullPage={true} />;
  }

  if (error || !order) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-8">
        <ErrorState
          message={error || "Order not found."}
          onRetry={fetchOrderDetails}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 font-redhat text-left max-w-5xl mx-auto pb-12">
      {/* Header Title */}
      <div className="flex items-center gap-3">
        <Link
          to="/admin/orders"
          className="border border-secondary300 bg-white p-2 rounded-full hover:bg-lightgrayColor transition-colors shrink-0"
        >
          <ArrowLeft className="w-4.5 h-4.5 text-secondary700" />
        </Link>
        <div>
          <h2 className="text-xl md:text-2xl font-medium tracking-wide text-darkColor">
            Fulfill Order {order.orderNumber}
          </h2>
          <p className="text-xs text-secondary500 tracking-wide mt-0.5">
            Placed on {formatDate(order.createdAt)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT COLUMN: FULFILLMENT CONTROLS & ITEMS */}
        <div className="lg:col-span-2 space-y-6">
          {/* Status and Logistics Manager */}
          <Card className="border border-secondary200">
            <CardHeader>
              <CardTitle>Logistics Fulfillment Center</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Order Status */}
              <div className="flex flex-col sm:flex-row gap-4 items-end justify-between border-b border-secondary200 pb-5">
                <div className="w-full sm:max-w-xs">
                  <Select
                    label="Update Order Status"
                    options={orderStatusOptions}
                    value={orderStatus}
                    onChange={(e) => setOrderStatus(e.target.value as any)}
                  />
                </div>
                <Button
                  onClick={handleUpdateStatus}
                  loading={saving}
                  className="w-full sm:w-auto text-xs py-2.5 px-4 font-medium shrink-0"
                >
                  Update Order State
                </Button>
              </div>

              {/* Courier Fulfillment */}
              <div className="space-y-4 pt-1">
                <h4 className="text-xs font-medium text-secondary700 uppercase tracking-widest pl-0.5">
                  Shipment & Tracking Assignment
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Select
                    label="Fulfillment Status"
                    options={fulfillmentStatusOptions}
                    value={fulfillmentStatus}
                    onChange={(e) =>
                      setFulfillmentStatus(e.target.value as any)
                    }
                  />
                  <Input
                    label="Courier Carrier"
                    placeholder="E.g. Bluedart"
                    value={carrierName}
                    onChange={(e) => setCarrierName(e.target.value)}
                  />
                  <Input
                    label="Tracking ID"
                    placeholder="E.g. BD123456789"
                    value={trackingId}
                    onChange={(e) => setTrackingId(e.target.value)}
                  />
                </div>
                <div className="flex justify-end pt-2">
                  <Button
                    onClick={handleUpdateFulfillment}
                    loading={saving}
                    className="w-full sm:w-auto text-xs py-2.5 px-4 font-medium"
                  >
                    Save Fulfillment Details
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Order Items Table */}
          <Card className="border border-secondary200">
            <div className="p-5 border-b border-secondary200 bg-lightgrayColor/30">
              <h3 className="text-sm font-medium text-darkColor uppercase tracking-widest flex items-center gap-2">
                Products Log
              </h3>
            </div>
            <CardContent className="p-0">
              <div className="divide-y divide-secondary200/50">
                {order.items.map((item) => (
                  <div key={item.id} className="p-4 flex gap-4">
                    <div className="w-14 h-14 bg-lightgrayColor border border-secondary200 rounded overflow-hidden shrink-0">
                      <img
                        src={item.productImage}
                        alt={item.productName}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-grow flex items-center justify-between text-left gap-4">
                      <div>
                        <h4 className="text-xs md:text-sm font-medium text-darkColor leading-snug">
                          {item.productName}
                        </h4>
                        <span className="text-[10px] text-secondary500 font-normal block mt-1 uppercase tracking-widest font-roboto">
                          Unit price: {formatPrice(item.unitPrice)}
                        </span>
                      </div>
                      <div className="text-right whitespace-nowrap">
                        <p className="text-xs font-normal text-secondary600">
                          Qty: {item.quantity}
                        </p>
                        <p className="text-xs font-medium text-darkColor mt-0.5">
                          {formatPrice(item.totalPrice)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN: CUSTOMER INFO, BILLING, INTERNAL NOTES */}
        <div className="space-y-6">
          {/* Customer Card */}
          <Card className="border border-secondary200">
            <div className="p-5 border-b border-secondary200 bg-lightgrayColor/30">
              <h3 className="text-sm font-medium text-darkColor uppercase tracking-widest flex items-center gap-2">
                Customer Identity
              </h3>
            </div>
            <CardContent className="p-5 text-xs md:text-sm text-left space-y-3 font-roboto">
              <div>
                <span className="text-secondary500 block">Contact Name</span>
                <span className="font-medium text-darkColor">
                  {order.customer?.fullName}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-secondary400 shrink-0" />
                <span className="font-medium text-secondary700">
                  {order.customer?.phone}
                </span>
              </div>
              <div className="flex items-center gap-2 truncate">
                <Mail className="w-4 h-4 text-secondary400 shrink-0" />
                <span className="font-medium text-secondary700 truncate">
                  {order.customer?.email}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Delivery destination */}
          <Card className="border border-secondary200">
            <div className="p-5 border-b border-secondary200 bg-lightgrayColor/30">
              <h3 className="text-sm font-medium text-darkColor uppercase tracking-widest flex items-center gap-2">
                Shipping Destination
              </h3>
            </div>
            <CardContent className="p-5 text-left text-xs md:text-sm">
              <p className="font-medium text-darkColor mb-1">
                {order.shippingAddress.fullName}
              </p>
              <p className="text-secondary600 mb-1 leading-snug">
                {order.shippingAddress.line1},{" "}
                {order.shippingAddress.line2 &&
                  `${order.shippingAddress.line2}, `}
                {order.shippingAddress.city}, {order.shippingAddress.state} -{" "}
                {order.shippingAddress.pincode}
              </p>
              <p className="font-normal text-secondary700 font-roboto">
                {order.shippingAddress.phone}
              </p>
            </CardContent>
          </Card>

          {/* INTERNAL NOTES LOGGER */}
          <Card className="border border-secondary200">
            <div className="p-5 border-b border-secondary200 bg-lightgrayColor/30">
              <h3 className="text-sm font-medium text-darkColor uppercase tracking-widest">
                Internal Logs & Notes
              </h3>
            </div>
            <CardContent className="p-5 text-left space-y-4">
              {/* Note records */}
              <div className="space-y-3.5 max-h-48 overflow-y-auto no-scrollbar border-b border-secondary200 pb-4">
                {!order.adminNotes || order.adminNotes.length === 0 ? (
                  <p className="text-xs text-secondary500 italic py-1">
                    No custom administrative notes logged.
                  </p>
                ) : (
                  order.adminNotes.map((note) => (
                    <div
                      key={note.id}
                      className="p-2.5 bg-lightgrayColor border border-secondary200 rounded-lg text-xs"
                    >
                      <p className="text-secondary700 leading-normal">
                        {note.note}
                      </p>
                      <div className="flex justify-between items-center text-[9px] text-secondary500 font-medium tracking-wider uppercase mt-2">
                        <span>By: {note.createdBy}</span>
                        <span>{formatDate(note.createdAt)}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Add Note Form */}
              <form onSubmit={handleAddNote} className="space-y-2">
                <textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Log custom instructions, packaging requests..."
                  rows={2}
                  className="w-full text-xs p-2.5 border border-secondary300 rounded-lg focus:outline-none focus:border-primaryBg"
                  disabled={saving}
                />
                <Button
                  type="submit"
                  variant="secondary"
                  size="sm"
                  loading={saving}
                  className="w-full text-xs font-medium"
                >
                  Add Internal Note
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminOrderDetail;
