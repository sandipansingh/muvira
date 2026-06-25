import React from 'react';
import { Check, ShieldCheck, Clock, Truck } from 'lucide-react';
import { STORE_NAME } from '../../lib/constants';

export interface OrderStatusTrackerProps {
  status: string;
  layout?: 'vertical' | 'horizontal';
}

export const OrderStatusTracker: React.FC<OrderStatusTrackerProps> = ({
  status,
  layout = 'vertical',
}) => {
  const steps = [
    {
      title: 'Paid',
      desc: 'Payment captured.',
      icon: ShieldCheck,
      isCompleted: true,
    },
    {
      title: 'Confirmed',
      desc: 'Order confirmed.',
      icon: Check,
      isCompleted: true,
    },
    {
      title: 'Crafting',
      desc: 'Preparing items.',
      icon: Clock,
      isCompleted: ['processing', 'shipped', 'delivered'].includes(status),
      isActive: status === 'confirmed',
    },
    {
      title: 'Shipped',
      desc: 'Logistics transit.',
      icon: Truck,
      isCompleted: ['shipped', 'delivered'].includes(status),
      isActive: status === 'shipped',
    },
  ];

  if (layout === 'horizontal') {
    return (
      <div className="w-full py-4 font-instrument">
        <div className="relative flex justify-between items-center w-full">
          {/* Connecting Line */}
          <div className="absolute left-[3%] right-[3%] top-[11px] h-[2px] bg-[#e6dfd5] z-0" />
          
          {/* Active progress color bar */}
          <div 
            className="absolute left-[3%] top-[11px] h-[2px] bg-[var(--accent)] transition-all duration-500 z-0"
            style={{ 
              width: `${
                status === 'delivered' || status === 'shipped' 
                  ? '94%' 
                  : ['processing', 'confirmed'].includes(status) 
                    ? '62%' 
                    : '31%'
              }`
            }}
          />

          {steps.map((step, idx) => {
            const isCompleted = step.isCompleted;
            const isActive = step.isActive;
            const Icon = step.icon;

            return (
              <div key={idx} className="relative z-10 flex flex-col items-center flex-1">
                {/* Step Circle */}
                <div 
                  className={`w-6 h-6 rounded-full flex items-center justify-center border text-[9px] transition-all duration-200 ${
                    isCompleted
                      ? 'bg-[var(--accent)] border-[var(--accent)] text-white shadow-sm'
                      : isActive
                        ? 'bg-white border-[var(--accent-gold)] text-[var(--accent-gold)] shadow-md scale-110 animate-pulse'
                        : 'bg-[#faf6ef] border-[#e6dfd5] text-secondary400'
                  }`}
                >
                  {isCompleted ? (
                    <Check className="w-3.5 h-3.5" strokeWidth={3} />
                  ) : (
                    <Icon className="w-3 h-3" />
                  )}
                </div>
                {/* Label */}
                <span className={`text-[10px] font-semibold mt-1.5 uppercase tracking-wider ${
                  isCompleted || isActive ? 'text-darkColor font-bold' : 'text-secondary400'
                }`}>
                  {step.title}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Vertical layout (default)
  return (
    <div className="relative pl-1 font-instrument">
      {/* Vertical Timeline Bar */}
      <div className="absolute left-[11px] top-2 bottom-2 w-[1.5px] bg-[#e6dfd5] pointer-events-none" />

      <div className="space-y-8">
        {steps.map((step, idx) => {
          const Icon = step.icon;
          const isCompleted = step.isCompleted;
          const isActive = step.isActive;
          
          return (
            <div key={idx} className="relative pl-10 flex items-start text-left">
              {/* Timeline node */}
              <span className={`absolute left-0 top-0.5 flex items-center justify-center w-6 h-6 rounded-full border transition-all duration-200 ${
                isCompleted 
                  ? 'bg-[var(--accent)] border-[var(--accent)] text-white shadow-sm' 
                  : isActive 
                    ? 'bg-white border-[var(--accent-gold)] text-[var(--accent-gold)] shadow-md animate-pulse scale-105'
                    : 'bg-[#faf6ef] border-[#e6dfd5] text-secondary400'
              }`}>
                {isCompleted ? (
                  <Check className="w-3.5 h-3.5" strokeWidth={3} />
                ) : (
                  <Icon className="w-3 h-3" />
                )}
              </span>
              
              {/* Text Content */}
              <div className="space-y-1">
                <h4 className={`text-sm font-semibold tracking-wide ${
                  isCompleted || isActive ? 'text-darkColor font-bold' : 'text-secondary500'
                }`}>
                  {step.title === 'Crafting' ? 'Workshop Preparation' : step.title === 'Shipped' ? 'Dispatched & Delivery' : step.title === 'Paid' ? 'Payment Verified' : 'Order Confirmed'}
                </h4>
                <p className="text-xs text-secondary500 leading-relaxed font-instrument max-w-lg">
                  {step.title === 'Paid' 
                    ? 'Payment successfully captured via secure gateway.' 
                    : step.title === 'Confirmed' 
                      ? `Accepted by workshop at ${STORE_NAME}.` 
                      : step.title === 'Crafting' 
                        ? 'Our artisans are preparing and polishing your heritage pieces.' 
                        : 'Shipped via premium tracking service. Delivery expected soon.'}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default OrderStatusTracker;
