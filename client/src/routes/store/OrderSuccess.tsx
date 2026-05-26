import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { formatPrice } from '../../lib/format';
import Button from '../../components/ui/Button';
import Card, { CardContent } from '../../components/ui/Card';
import { CheckCircle2, ShoppingBag, ClipboardList, ShieldCheck } from 'lucide-react';
import { STORE_NAME } from '../../lib/constants';

export const OrderSuccess: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Retrieve details passed from checkout routing
  const orderNumber = location.state?.orderNumber || 'MUV-' + Math.floor(100000 + Math.random() * 900000);
  const totalAmount = location.state?.totalAmount || 0;

  return (
    <div className="min-h-[75vh] flex items-center justify-center py-12 px-6 font-instrument text-center">
      <Card className="w-full max-w-md border border-emerald-100 shadow-xl overflow-hidden bg-white">
        <div className="bg-emerald-50 py-10 px-6 border-b border-emerald-100 flex flex-col items-center">
          <CheckCircle2 className="w-16 h-16 text-emerald-500 mb-4 animate-bounce" />
          <h1 className="text-xl md:text-2xl font-bold text-emerald-900 tracking-wide">
            Order Confirmed!
          </h1>
          <p className="text-xs md:text-sm text-emerald-700 font-medium tracking-wide mt-1.5 leading-relaxed">
            Thank you for shopping at {STORE_NAME}. Your payment has been secured and verified.
          </p>
        </div>

        <CardContent className="p-6 space-y-6 text-left">
          {/* Billing Info */}
          <div className="bg-lightgrayColor rounded-xl border border-secondary200 p-4 space-y-3 font-instrument">
            <div className="flex justify-between items-center text-xs">
              <span className="text-secondary500 font-semibold uppercase tracking-wider">Order Reference</span>
              <span className="font-bold text-darkColor text-sm">{orderNumber}</span>
            </div>
            {totalAmount > 0 && (
              <div className="flex justify-between items-center text-xs border-t border-secondary200/50 pt-2.5">
                <span className="text-secondary500 font-semibold uppercase tracking-wider">Amount Paid</span>
                <span className="font-bold text-primaryBg text-sm">{formatPrice(totalAmount)}</span>
              </div>
            )}
            <div className="flex justify-between items-center text-xs border-t border-secondary200/50 pt-2.5">
              <span className="text-secondary500 font-semibold uppercase tracking-wider">Payment Status</span>
              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> PAID
              </span>
            </div>
          </div>

          <p className="text-xs text-secondary600 text-center leading-relaxed">
            A confirmation invoice has been sent to your email. We are processing this order and will update tracking shortly.
          </p>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => navigate('/orders')}
              className="flex-1 flex items-center justify-center gap-1.5 text-xs md:text-sm bg-white"
            >
              <ClipboardList className="w-4 h-4 shrink-0" />
              My Orders
            </Button>
            <Button
              variant="primary"
              onClick={() => navigate('/products')}
              className="flex-1 flex items-center justify-center gap-1.5 text-xs md:text-sm"
            >
              <ShoppingBag className="w-4 h-4 shrink-0" />
              Shop More
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OrderSuccess;
