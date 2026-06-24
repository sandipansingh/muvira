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
      current: 'text-sm font-medium font-instrument',
      original: 'text-xs font-instrument',
      discount: 'text-[10px] px-1.5 py-0.2 font-instrument',
    },
    md: {
      current: 'text-base font-medium md:text-font19 font-instrument',
      original: 'text-xs md:text-sm font-instrument',
      discount: 'text-xs px-2 py-0.5 font-instrument',
    },
    lg: {
      current: 'text-xl md:text-2xl font-medium font-instrument',
      original: 'text-sm md:text-base font-instrument',
      discount: 'text-sm px-2.5 py-0.5 font-instrument',
    },
  };

  return (
    <div className={`flex items-center gap-2 flex-wrap ${className}`}>
      {/* Current/Sale Price */}
      <span className={`text-[var(--text)] tracking-wide ${sizeClasses[size].current}`}>
        {formatPrice(currentPrice)}
      </span>

      {/* Strikethrough Original Price */}
      {hasDiscount && (
        <>
          <del className={`text-[var(--text-muted)] font-normal line-through ${sizeClasses[size].original}`}>
            {formatPrice(price)}
          </del>

          {/* Discount Text */}
          {discountPercent > 0 && (
            <span className="text-[var(--text-muted)] font-medium uppercase tracking-wider text-xs md:text-sm font-instrument">
              ({discountPercent}% OFF)
            </span>
          )}
        </>
      )}
    </div>
  );
};

export default PriceDisplay;
