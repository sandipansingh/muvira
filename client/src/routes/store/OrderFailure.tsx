import React from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../../components/ui/Button';
import Card, { CardContent } from '../../components/ui/Card';
import { AlertCircle, ShoppingCart, HelpCircle } from 'lucide-react';

export const OrderFailure: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-[75vh] flex items-center justify-center py-12 px-6 font-redhat text-center">
      <Card className="w-full max-w-md border border-rose-100 shadow-xl overflow-hidden bg-white">
        <div className="bg-rose-50 py-10 px-6 border-b border-rose-100 flex flex-col items-center">
          <AlertCircle className="w-16 h-16 text-rose-500 mb-4 animate-pulse" />
          <h1 className="text-xl md:text-2xl font-bold text-rose-900 tracking-wide">
            Payment Cancelled / Failed
          </h1>
          <p className="text-xs md:text-sm text-rose-700 font-medium tracking-wide mt-1.5 leading-relaxed">
            Your transaction was not completed. If any funds were deducted, they will be refunded within 3-5 business days.
          </p>
        </div>

        <CardContent className="p-6 space-y-6 text-left">
          <div className="text-xs md:text-sm text-secondary600 space-y-2">
            <p className="font-semibold text-darkColor">Why did this happen?</p>
            <ul className="list-disc pl-5 space-y-1.5 text-xs text-secondary500">
              <li>Checkout window was closed before completion</li>
              <li>Bank card or UPI account declined transaction</li>
              <li>Simulated verification error in Sandbox mode</li>
            </ul>
          </div>

          {/* Action links */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => navigate('/cart')}
              className="flex-1 flex items-center justify-center gap-1.5 text-xs md:text-sm bg-white"
            >
              <ShoppingCart className="w-4 h-4 shrink-0" />
              Return to Cart
            </Button>
            <Button
              variant="primary"
              onClick={() => navigate('/checkout')}
              className="flex-1 flex items-center justify-center gap-1.5 text-xs md:text-sm"
            >
              <HelpCircle className="w-4 h-4 shrink-0" />
              Retry Payment
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OrderFailure;
