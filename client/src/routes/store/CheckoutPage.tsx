import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "../../hooks/useCart";
import { useToast } from "../../hooks/useToast";
import { formatPrice } from "../../lib/format";
import { addressesApiService } from "../../lib/api/addresses";
import { ordersApiService } from "../../lib/api/orders";
import type { Address } from "../../types/cart";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Select from "../../components/ui/Select";
import Card, { CardContent } from "../../components/ui/Card";
import Dialog from "../../components/ui/Dialog";
import Breadcrumb from "../../components/layout/Breadcrumb";
import {
  MapPin,
  Plus,
  ShieldCheck,
  CreditCard,
  Check,
  Truck,
} from "lucide-react";
import { STORE_NAME, INDIAN_STATES } from "../../lib/constants";

export const CheckoutPage: React.FC = () => {
  const { cart, coupon, shippingAmount, totalAmount, clearCartState } = useCart();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [carrierNote, setCarrierNote] = useState("");
  const [paying, setPaying] = useState(false);

  // Address edit modal state
  const [addressModalOpen, setAddressModalOpen] = useState(false);
  const [newLabel, setNewLabel] = useState("home");
  const [newFullName, setNewFullName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newLine1, setNewLine1] = useState("");
  const [newLine2, setNewLine2] = useState("");
  const [newCity, setNewCity] = useState("");
  const [newState, setNewState] = useState("");
  const [newPincode, setNewPincode] = useState("");
  const [newIsDefault, setNewIsDefault] = useState(false);
  const [addingAddress, setAddingAddress] = useState(false);

  useEffect(() => {
    fetchAddresses();
  }, []);

  const fetchAddresses = async () => {
    setLoading(true);
    const res = await addressesApiService.getAddresses();
    if (res.success) {
      setAddresses(res.data);
      const def = res.data.find((a) => a.isDefault);
      if (def) {
        setSelectedAddressId(def.id);
      } else if (res.data.length > 0) {
        setSelectedAddressId(res.data[0].id);
      }
    }
    setLoading(false);
  };

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !newFullName ||
      !newPhone ||
      !newLine1 ||
      !newCity ||
      !newState ||
      !newPincode
    ) {
      showToast("Please fill in all mandatory address fields.", "error");
      return;
    }

    setAddingAddress(true);
    const res = await addressesApiService.createAddress({
      label: newLabel,
      fullName: newFullName,
      phone: newPhone,
      line1: newLine1,
      line2: newLine2 || null,
      city: newCity,
      state: newState,
      pincode: newPincode,
      country: "India",
      isDefault: newIsDefault,
    });
    setAddingAddress(false);

    if (res.success) {
      showToast("Address added successfully.", "success");
      setAddressModalOpen(false);

      // Reset form
      setNewLabel("home");
      setNewFullName("");
      setNewPhone("");
      setNewLine1("");
      setNewLine2("");
      setNewCity("");
      setNewState("");
      setNewPincode("");
      setNewIsDefault(false);

      // Re-fetch
      await fetchAddresses();
      setSelectedAddressId(res.data.id);
    } else {
      showToast(res.error.message || "Failed to add address.", "error");
    }
  };

  const handlePayNow = async () => {
    if (!selectedAddressId) {
      showToast("Please select or add a shipping address.", "error");
      return;
    }
    setPaying(true);

    setLoading(true);
    const res = await ordersApiService.createOrder(
      selectedAddressId,
      coupon ? coupon.code : null,
    );
    setLoading(false);

    if (!res.success) {
      showToast(res.error.message || "Failed to initiate order.", "error");
      if (res.error.code === "OUT_OF_STOCK") navigate("/cart");
      return;
    }

    const {
      razorpayOrderId,
      razorpayKeyId,
      amount,
      currency,
      orderNumber,
      totalAmount: orderTotal,
    } = res.data;

    // Open real Razorpay Checkout (SDK loaded via <script> in index.html)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const RazorpayConstructor = (window as any).Razorpay;
    if (!RazorpayConstructor) {
      showToast(
        "Payment gateway unavailable. Please refresh and try again.",
        "error",
      );
      return;
    }

    const rzp = new RazorpayConstructor({
      key: razorpayKeyId,
      amount,
      currency,
      order_id: razorpayOrderId,
      name: STORE_NAME,
      description: `Order ${orderNumber}`,
      handler: async (response: {
        razorpay_order_id: string;
        razorpay_payment_id: string;
        razorpay_signature: string;
      }) => {
        const verifyRes = await ordersApiService.verifyPayment(
          response.razorpay_order_id,
          response.razorpay_payment_id,
          response.razorpay_signature,
        );
        if (verifyRes.success) {
          clearCartState();
          navigate("/orders/success", {
            state: {
              orderNumber: verifyRes.data.orderNumber,
              totalAmount: orderTotal,
              orderId: verifyRes.data.orderId,
            },
          });
        } else {
          showToast(
            verifyRes.error.message || "Payment verification failed",
            "error",
          );
          navigate("/orders/failure");
        }
      },
      modal: {
        ondismiss: () => {
          setPaying(false);
          showToast("Payment cancelled", "info");
        },
      },
    });

    rzp.open();
  };

  if (cart.items.length === 0) {
    return (
      <div className="max-w-[1240px] mx-auto px-6 py-12 text-center font-instrument">
        <h2 className="text-lg font-bold text-darkColor mb-2">Cart is empty</h2>
        <Button onClick={() => navigate("/products")}>Continue Shopping</Button>
      </div>
    );
  }

  return (
    <div className="max-w-[1240px] mx-auto px-6 py-6 font-instrument text-left">
      <Breadcrumb
        items={[
          { label: "Shopping Cart", path: "/cart" },
          { label: "Secure Checkout" },
        ]}
      />

      <h1 className="text-xl md:text-2xl font-bold tracking-wide text-darkColor my-6">
        Secure Checkout
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* CHECKOUT FORMS */}
        <div className="lg:col-span-2 space-y-6">
          {/* Address Section */}
          <Card className="border border-secondary200">
            <div className="p-5 border-b border-secondary200 flex justify-between items-center bg-lightgrayColor/30">
              <h3 className="text-sm font-bold text-darkColor uppercase tracking-widest flex items-center gap-2">
                <MapPin className="w-4.5 h-4.5 text-primaryBg" />
                Shipping Address
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAddressModalOpen(true)}
                className="text-xs bg-white py-1.5 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                Add New Address
              </Button>
            </div>
            <CardContent className="p-5">
              {loading ? (
                <div className="space-y-3">
                  <div className="h-20 bg-gray-100 animate-pulse rounded-lg" />
                  <div className="h-20 bg-gray-100 animate-pulse rounded-lg" />
                </div>
              ) : addresses.length === 0 ? (
                <div className="text-center py-6 text-xs md:text-sm text-secondary500 leading-relaxed">
                  No shipping addresses found. Please click 'Add New Address' to
                  continue.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {addresses.map((addr) => (
                    <div
                      key={addr.id}
                      onClick={() => setSelectedAddressId(addr.id)}
                      className={`p-4 rounded-xl border text-left cursor-pointer transition-all ${
                        selectedAddressId === addr.id
                          ? "border-darkColor bg-secondary50/30"
                          : "border-secondary200 hover:border-secondary300"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="border border-secondary300 text-secondary600 text-[10px] font-medium px-2 py-0.5 rounded uppercase tracking-wider">
                          {addr.label}
                        </span>
                        {selectedAddressId === addr.id && (
                          <Check className="w-4 h-4 text-darkColor" />
                        )}
                      </div>
                      <p className="text-sm font-medium text-darkColor mb-1">
                        {addr.fullName}
                      </p>
                      <p className="text-xs text-secondary600 mb-1 leading-snug">
                        {addr.line1}, {addr.line2 && `${addr.line2}, `}
                        {addr.city}, {addr.state} - {addr.pincode}
                      </p>
                      <p className="text-xs font-normal text-secondary600 font-instrument">
                        {addr.phone}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Delivery Note */}
          <Card className="border border-secondary200">
            <div className="p-5 border-b border-secondary200 bg-lightgrayColor/30">
              <h3 className="text-sm font-bold text-darkColor uppercase tracking-widest flex items-center gap-2">
                <Truck className="w-4.5 h-4.5 text-primaryBg" />
                Delivery Instructions
              </h3>
            </div>
            <CardContent className="p-5">
              <textarea
                value={carrierNote}
                onChange={(e) => setCarrierNote(e.target.value)}
                placeholder="E.g., Please leave it with neighbors, call before delivery, gift wrap requests..."
                rows={3}
                className="w-full text-xs md:text-sm p-3 border border-secondary300 rounded-lg focus:outline-none focus:border-primaryBg focus:ring-1 focus:ring-primaryBg/30"
              />
            </CardContent>
          </Card>
        </div>

        {/* ORDER REVIEW & PAYMENT */}
        <div>
          <Card className="border border-secondary200 shadow-sm sticky top-20">
            <div className="p-5 border-b border-secondary200 bg-lightgrayColor/30">
              <h3 className="text-sm font-bold text-darkColor uppercase tracking-widest">
                Payment Details
              </h3>
            </div>
            <CardContent className="p-5 space-y-5">
              {/* Product recap list */}
              <div className="max-h-40 overflow-y-auto no-scrollbar space-y-2 border-b border-secondary200 pb-4">
                {cart.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex justify-between text-xs text-secondary700"
                  >
                    <span className="truncate max-w-[200px]">
                      {item.productName} <b>x{item.quantity}</b>
                    </span>
                    <span className="font-semibold">
                      {formatPrice(item.lineTotal)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Total rows */}
              <div className="space-y-2.5 text-xs md:text-sm tracking-wide">
                <div className="flex justify-between text-secondary600">
                  <span>Items Subtotal</span>
                  <span className="font-semibold text-darkColor">
                    {formatPrice(cart.subtotal)}
                  </span>
                </div>
                {coupon && (
                  <div className="flex justify-between text-emerald-700 font-semibold">
                    <span>Coupon Discount</span>
                    <span>-{formatPrice(coupon.discountAmount)}</span>
                  </div>
                )}
                 <div className="flex justify-between text-secondary600">
                  <span>Shipping & Delivery</span>
                  {shippingAmount === 0 ? (
                    <span className="text-emerald-700 font-semibold uppercase tracking-wider">Free</span>
                  ) : (
                    <span className="font-semibold text-darkColor">{formatPrice(shippingAmount)}</span>
                  )}
                </div>
              </div>

              {/* Total Payable */}
              <div className="border-t border-secondary200 pt-4 flex justify-between items-center text-darkColor font-bold">
                <span className="text-sm md:text-base uppercase tracking-wider">
                  Total Payable
                </span>
                <span className="text-base md:text-xl text-primaryBg">
                  {formatPrice(totalAmount)}
                </span>
              </div>

              <Button
                variant="primary"
                onClick={handlePayNow}
                loading={paying}
                disabled={paying}
                className="w-full py-3.5 flex items-center justify-center gap-2 text-sm"
              >
                <ShieldCheck className="w-5 h-5" />
                Pay Now ({formatPrice(totalAmount)})
              </Button>

              <div className="flex items-center justify-center gap-1.5 text-[10px] uppercase text-secondary500 font-semibold tracking-wider pt-2">
                <CreditCard className="w-3.5 h-3.5" />
                Secured via Razorpay Checkout
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* MODAL 1: ADD NEW SHIPPING ADDRESS */}
      <Dialog
        isOpen={addressModalOpen}
        onClose={() => setAddressModalOpen(false)}
        title="Add Delivery Address"
      >
        <form onSubmit={handleAddAddress} className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            <Button
              type="button"
              variant={newLabel === "home" ? "primary" : "secondary"}
              size="sm"
              onClick={() => setNewLabel("home")}
              className="py-2 text-xs"
            >
              Home
            </Button>
            <Button
              type="button"
              variant={newLabel === "office" ? "primary" : "secondary"}
              size="sm"
              onClick={() => setNewLabel("office")}
              className="py-2 text-xs"
            >
              Office
            </Button>
            <Button
              type="button"
              variant={newLabel === "other" ? "primary" : "secondary"}
              size="sm"
              onClick={() => setNewLabel("other")}
              className="py-2 text-xs"
            >
              Other
            </Button>
          </div>

          <Input
            label="Receiver's Full Name *"
            value={newFullName}
            onChange={(e) => setNewFullName(e.target.value)}
            placeholder="Asha Roy"
            maxLength={200}
          />

          <Input
            label="Phone Number *"
            value={newPhone}
            onChange={(e) => setNewPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
            placeholder="9876543210"
            maxLength={10}
          />

          <Input
            label="Address Line 1 *"
            value={newLine1}
            onChange={(e) => setNewLine1(e.target.value)}
            placeholder="House/Flat No., Street, Area"
            maxLength={500}
          />

          <Input
            label="Address Line 2"
            value={newLine2}
            onChange={(e) => setNewLine2(e.target.value)}
            placeholder="Landmark, Sector, Suite"
            maxLength={500}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="City *"
              value={newCity}
              onChange={(e) => setNewCity(e.target.value)}
              placeholder="Kolkata"
              maxLength={200}
            />
            <Select
              label="State *"
              value={newState}
              onChange={(e) => setNewState(e.target.value)}
              options={[{ value: "", label: "Select State" }, ...INDIAN_STATES]}
            />
          </div>

          <Input
            label="Pincode *"
            value={newPincode}
            onChange={(e) => setNewPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="700016"
            maxLength={6}
          />

          <label className="flex items-center gap-2 cursor-pointer py-1">
            <input
              type="checkbox"
              checked={newIsDefault}
              onChange={(e) => setNewIsDefault(e.target.checked)}
              className="w-4 h-4 accent-primaryBg"
            />
            <span className="text-xs font-semibold text-secondary600">
              Set as default address
            </span>
          </label>

          <Button
            type="submit"
            loading={addingAddress}
            className="w-full py-2.5"
          >
            Add Shipping Address
          </Button>
        </form>
      </Dialog>
    </div>
  );
};

export default CheckoutPage;
