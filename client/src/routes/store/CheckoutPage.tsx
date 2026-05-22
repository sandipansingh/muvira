import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../hooks/useCart';
import { useToast } from '../../hooks/useToast';
import { formatPrice } from '../../lib/format';
import { authMockService } from '../../mocks/auth.mock';
import { ordersMockService } from '../../mocks/orders.mock';
import type { Address } from '../../types/cart';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Card, { CardContent } from '../../components/ui/Card';
import Dialog from '../../components/ui/Dialog';
import Breadcrumb from '../../components/layout/Breadcrumb';
import { MapPin, Plus, ShieldCheck, CreditCard, Check, AlertTriangle, Truck } from 'lucide-react';
import { STORE_NAME } from '../../lib/constants';

export const CheckoutPage: React.FC = () => {
  const { cart, coupon, totalAmount, clearCartState } = useCart();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [carrierNote, setCarrierNote] = useState('');

  // Address edit modal state
  const [addressModalOpen, setAddressModalOpen] = useState(false);
  const [newLabel, setNewLabel] = useState('home');
  const [newFullName, setNewFullName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newLine1, setNewLine1] = useState('');
  const [newLine2, setNewLine2] = useState('');
  const [newCity, setNewCity] = useState('');
  const [newState, setNewState] = useState('');
  const [newPincode, setNewPincode] = useState('');
  const [newIsDefault, setNewIsDefault] = useState(false);
  const [addingAddress, setAddingAddress] = useState(false);

  // Razorpay payment simulation modal state
  const [razorpayModalOpen, setRazorpayModalOpen] = useState(false);
  const [paymentData, setPaymentData] = useState<any>(null);
  const [paying, setPaying] = useState(false);
  const [selectedPayMethod, setSelectedPayMethod] = useState<'upi' | 'card' | 'netbanking'>('upi');

  useEffect(() => {
    fetchAddresses();
  }, []);

  const fetchAddresses = async () => {
    setLoading(true);
    const res = await authMockService.getAddresses();
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
    if (!newFullName || !newPhone || !newLine1 || !newCity || !newState || !newPincode) {
      showToast('Please fill in all mandatory address fields.', 'error');
      return;
    }

    setAddingAddress(true);
    const res = await authMockService.createAddress({
      label: newLabel,
      fullName: newFullName,
      phone: newPhone,
      line1: newLine1,
      line2: newLine2 || null,
      city: newCity,
      state: newState,
      pincode: newPincode,
      country: 'India',
      isDefault: newIsDefault,
    });
    setAddingAddress(false);

    if (res.success) {
      showToast('Address added successfully.', 'success');
      setAddressModalOpen(false);
      
      // Reset form
      setNewLabel('home');
      setNewFullName('');
      setNewPhone('');
      setNewLine1('');
      setNewLine2('');
      setNewCity('');
      setNewState('');
      setNewPincode('');
      setNewIsDefault(false);

      // Re-fetch
      await fetchAddresses();
      setSelectedAddressId(res.data.id);
    } else {
      showToast(res.error.message || 'Failed to add address.', 'error');
    }
  };

  const handlePayNow = async () => {
    if (!selectedAddressId) {
      showToast('Please select or add a shipping address.', 'error');
      return;
    }

    setLoading(true);
    const res = await ordersMockService.createOrder(
      selectedAddressId,
      coupon ? coupon.code : null,
      carrierNote.trim() || null
    );
    setLoading(false);

    if (res.success) {
      // Order created successfully - open Razorpay simulation modal
      setPaymentData(res.data);
      setRazorpayModalOpen(true);
    } else {
      showToast(res.error.message || 'Failed to initiate order placement.', 'error');
      if (res.error.code === 'OUT_OF_STOCK') {
        // Redirect back to cart or handle stock refresh
        navigate('/cart');
      }
    }
  };

  const handleRazorpaySuccess = async () => {
    if (!paymentData) return;
    setPaying(true);

    const res = await ordersMockService.verifyPayment(
      paymentData.razorpayOrderId,
      'pay_' + Math.random().toString(36).substring(2, 10),
      'sig_' + Math.random().toString(36).substring(2, 15)
    );
    setPaying(false);

    if (res.success) {
      setRazorpayModalOpen(false);
      clearCartState();
      // Navigate to success
      navigate('/orders/success', {
        state: { orderNumber: res.data.orderNumber, totalAmount: paymentData.totalAmount },
      });
    } else {
      showToast(res.error.message || 'Payment signature mismatch', 'error');
      setRazorpayModalOpen(false);
      navigate('/orders/failure');
    }
  };

  const handleRazorpayCancel = () => {
    setRazorpayModalOpen(false);
    navigate('/orders/failure');
  };

  if (cart.items.length === 0) {
    return (
      <div className="max-w-[1240px] mx-auto px-6 py-12 text-center font-redhat">
        <h2 className="text-lg font-bold text-darkColor mb-2">Cart is empty</h2>
        <Button onClick={() => navigate('/products')}>Continue Shopping</Button>
      </div>
    );
  }

  return (
    <div className="max-w-[1240px] mx-auto px-6 py-6 font-redhat text-left">
      <Breadcrumb
        items={[
          { label: 'Shopping Cart', path: '/cart' },
          { label: 'Secure Checkout' },
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
                  No shipping addresses found. Please click 'Add New Address' to continue.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {addresses.map((addr) => (
                    <div
                      key={addr.id}
                      onClick={() => setSelectedAddressId(addr.id)}
                      className={`p-4 rounded-xl border text-left cursor-pointer transition-all ${
                        selectedAddressId === addr.id
                          ? 'border-darkColor bg-secondary50/30'
                          : 'border-secondary200 hover:border-secondary300'
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
                      <p className="text-sm font-medium text-darkColor mb-1">{addr.fullName}</p>
                      <p className="text-xs text-secondary600 mb-1 leading-snug">
                        {addr.line1}, {addr.line2 && `${addr.line2}, `}
                        {addr.city}, {addr.state} - {addr.pincode}
                      </p>
                      <p className="text-xs font-normal text-secondary600 font-roboto">{addr.phone}</p>
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
                  <div key={item.id} className="flex justify-between text-xs text-secondary700">
                    <span className="truncate max-w-[200px]">
                      {item.productName} <b>x{item.quantity}</b>
                    </span>
                    <span className="font-semibold">{formatPrice(item.lineTotal)}</span>
                  </div>
                ))}
              </div>

              {/* Total rows */}
              <div className="space-y-2.5 text-xs md:text-sm tracking-wide">
                <div className="flex justify-between text-secondary600">
                  <span>Items Subtotal</span>
                  <span className="font-semibold text-darkColor">{formatPrice(cart.subtotal)}</span>
                </div>
                {coupon && (
                  <div className="flex justify-between text-emerald-700 font-semibold">
                    <span>Coupon Discount</span>
                    <span>-{formatPrice(coupon.discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-secondary600">
                  <span>Shipping & Delivery</span>
                  <span className="text-emerald-700 font-semibold">Free</span>
                </div>
              </div>

              {/* Total Payable */}
              <div className="border-t border-secondary200 pt-4 flex justify-between items-center text-darkColor font-bold">
                <span className="text-sm md:text-base uppercase tracking-wider">Total Payable</span>
                <span className="text-base md:text-xl text-primaryBg">{formatPrice(totalAmount)}</span>
              </div>

              <Button
                variant="primary"
                onClick={handlePayNow}
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
              variant={newLabel === 'home' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setNewLabel('home')}
              className="py-2 text-xs"
            >
              Home
            </Button>
            <Button
              type="button"
              variant={newLabel === 'office' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setNewLabel('office')}
              className="py-2 text-xs"
            >
              Office
            </Button>
            <Button
              type="button"
              variant={newLabel === 'other' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setNewLabel('other')}
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
          />

          <Input
            label="Phone Number *"
            value={newPhone}
            onChange={(e) => setNewPhone(e.target.value)}
            placeholder="+919876543210"
          />

          <Input
            label="Address Line 1 *"
            value={newLine1}
            onChange={(e) => setNewLine1(e.target.value)}
            placeholder="House/Flat No., Street, Area"
          />

          <Input
            label="Address Line 2"
            value={newLine2}
            onChange={(e) => setNewLine2(e.target.value)}
            placeholder="Landmark, Sector, Suite"
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="City *"
              value={newCity}
              onChange={(e) => setNewCity(e.target.value)}
              placeholder="Kolkata"
            />
            <Input
              label="State *"
              value={newState}
              onChange={(e) => setNewState(e.target.value)}
              placeholder="West Bengal"
            />
          </div>

          <Input
            label="Pincode *"
            value={newPincode}
            onChange={(e) => setNewPincode(e.target.value)}
            placeholder="700016"
          />

          <label className="flex items-center gap-2 cursor-pointer py-1">
            <input
              type="checkbox"
              checked={newIsDefault}
              onChange={(e) => setNewIsDefault(e.target.checked)}
              className="w-4 h-4 accent-primaryBg"
            />
            <span className="text-xs font-semibold text-secondary600">Set as default address</span>
          </label>

          <Button type="submit" loading={addingAddress} className="w-full py-2.5">
            Add Shipping Address
          </Button>
        </form>
      </Dialog>

      {/* MODAL 2: SIMULATED RAZORPAY CHECKOUT WINDOW */}
      <Dialog
        isOpen={razorpayModalOpen}
        onClose={handleRazorpayCancel}
        title="Razorpay Secure Checkout"
        maxWidth="sm"
      >
        <div className="flex flex-col text-left font-sans select-none">
          {/* Razorpay Banner */}
          <div className="bg-[#1C2D5A] text-white p-5 rounded-t-xl -mx-6 -mt-5 flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase font-bold tracking-widest text-slate-300">Merchant</p>
              <h4 className="text-lg font-bold text-white leading-tight">{STORE_NAME}</h4>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase font-bold tracking-widest text-slate-300">Amount</p>
              <h4 className="text-lg font-bold text-white leading-tight">
                {paymentData && formatPrice(paymentData.totalAmount)}
              </h4>
            </div>
          </div>

          {/* Checkout Body */}
          <div className="py-6 space-y-5">
            <div className="p-3.5 bg-sky-50 border border-sky-100 rounded-xl flex items-start gap-2.5">
              <ShieldCheck className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
              <p className="text-xs leading-relaxed text-sky-800">
                You are playing in the <b>Razorpay Sandbox Mock environment</b>. No actual currency transaction will occur.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                Select Test Payment Mode
              </label>
              <div className="grid grid-cols-3 gap-2.5">
                <button
                  type="button"
                  onClick={() => setSelectedPayMethod('upi')}
                  className={`p-3 rounded-lg border flex flex-col items-center justify-center gap-1.5 transition-all text-xs font-semibold ${
                    selectedPayMethod === 'upi'
                      ? 'border-[#3399FF] bg-sky-50 text-[#3399FF]'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span className="text-[10px] uppercase tracking-wide">UPI / Net</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPayMethod('card')}
                  className={`p-3 rounded-lg border flex flex-col items-center justify-center gap-1.5 transition-all text-xs font-semibold ${
                    selectedPayMethod === 'card'
                      ? 'border-[#3399FF] bg-sky-50 text-[#3399FF]'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span className="text-[10px] uppercase tracking-wide">Debit Card</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPayMethod('netbanking')}
                  className={`p-3 rounded-lg border flex flex-col items-center justify-center gap-1.5 transition-all text-xs font-semibold ${
                    selectedPayMethod === 'netbanking'
                      ? 'border-[#3399FF] bg-sky-50 text-[#3399FF]'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span className="text-[10px] uppercase tracking-wide">Netbanking</span>
                </button>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-4 flex flex-col gap-2">
              <Button
                type="button"
                loading={paying}
                onClick={handleRazorpaySuccess}
                className="w-full bg-[#3399FF] text-white hover:bg-[#2582df] py-3 text-sm flex items-center justify-center gap-1.5"
              >
                <Check className="w-5 h-5" />
                Pay Successfully (Simulate Success)
              </Button>

              <Button
                type="button"
                variant="ghost"
                onClick={handleRazorpayCancel}
                className="w-full border border-rose-200 text-rose-600 hover:bg-rose-50 py-3 text-sm flex items-center justify-center gap-1.5"
              >
                <AlertTriangle className="w-5 h-5 shrink-0" />
                Simulate Payment Failure
              </Button>
            </div>
          </div>
        </div>
      </Dialog>
    </div>
  );
};

export default CheckoutPage;
