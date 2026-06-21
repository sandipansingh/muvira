import React from 'react';
import { formatPrice } from '../../lib/format';

interface PriceDisplayProps {
  price: number; // in paisa
  salePrice: number | null; // in paisa
  discountPercent?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const PriceDisplay: React.FC<PriceDisplayProps> = ({
  price,
  salePrice,
  discountPercent = 0,
  size = 'md',
  className = '',
}) => {
  const hasDiscount = salePrice !== null && salePrice < price;
  const currentPrice = hasDiscount && salePrice !== null ? salePrice : price;

  const sizeClasses = {
    sm: {
      current: 'text-sm font-semibold',
      original: 'text-xs',
      discount: 'text-[10px] px-1.5 py-0.2',
    },
    md: {
      current: 'text-base font-semibold md:text-font19',
      original: 'text-xs md:text-sm',
      discount: 'text-xs px-2 py-0.5',
    },
    lg: {
      current: 'text-xl md:text-2xl font-bold',
      original: 'text-sm md:text-base',
      discount: 'text-sm px-2.5 py-0.5',
    },
  };

  return (
    <div className={`flex items-center gap-2 flex-wrap ${className}`}>
      {/* Current/Sale Price */}
      <span className={`text-secondarytext tracking-wide ${sizeClasses[size].current}`}>
        {formatPrice(currentPrice)}
      </span>

      {/* Strikethrough Original Price */}
      {hasDiscount && (
        <>
          <del className={`text-secondary500 font-normal line-through ${sizeClasses[size].original}`}>
            {formatPrice(price)}
          </del>

          {/* Discount Badge */}
          {discountPercent > 0 && (
            <span className={`bg-emerald-50 border border-emerald-200 text-successColor font-semibold rounded-md uppercase tracking-wider ${sizeClasses[size].discount}`}>
              {discountPercent}% OFF
            </span>
          )}
        </>
      )}
    </div>
  );
};

export default PriceDisplay;
