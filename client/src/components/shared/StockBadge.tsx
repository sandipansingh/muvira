import React from 'react';

interface StockBadgeProps {
  stock: number;
}

export const StockBadge: React.FC<StockBadgeProps> = ({ stock }) => {
  if (stock <= 0) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider bg-rose-50 border border-rose-200 text-dangerColor">
        Out of Stock
      </span>
    );
  }

  if (stock <= 5) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider bg-amber-50 border border-amber-200 text-amber-800 animate-pulse">
        Only {stock} Left
      </span>
    );
  }

  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider bg-emerald-50 border border-emerald-200 text-emerald-800">
      In Stock
    </span>
  );
};

export default StockBadge;
