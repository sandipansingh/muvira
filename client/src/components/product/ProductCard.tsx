import React from 'react';
import { Link } from 'react-router-dom';
import type { ProductListItem } from '../../types/product';
import PriceDisplay from '../shared/PriceDisplay';
import { useCart } from '../../hooks/useCart';
import { Star, ShoppingCart } from 'lucide-react';

interface ProductCardProps {
  product: ProductListItem;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const { addToCart } = useCart();
  const [adding, setAdding] = React.useState(false);

  const handleQuickAdd = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (adding) return;
    setAdding(true);
    await addToCart(product.id, 1);
    setAdding(false);
  };

  const hasDiscount = product.salePrice !== null && product.salePrice < product.price;

  return (
    <Link
      to={`/products/${product.slug}`}
      className="group bg-[var(--surface)] rounded-xl border border-[var(--border)] p-2.5 flex flex-col relative w-full h-full text-left"
    >
      {/* Product Image Cover */}
      <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-[var(--surface-2)] shrink-0">
        <img
          src={product.primaryImageUrl}
          alt={product.name}
          className="w-full h-full object-cover"
          loading="lazy"
        />

        {/* Promo tag — refined */}
        {hasDiscount && (
          <span className="absolute top-3 left-3 bg-white text-[var(--text)] text-[9px] font-semibold px-2.5 py-px rounded tracking-[1px] uppercase border border-[var(--border)] shadow-sm">
            Sale
          </span>
        )}

        {/* Stock overlays */}
        {product.stock <= 0 && (
          <span className="absolute top-3 right-3 bg-rose-50 text-rose-700 text-[9px] font-semibold px-2.5 py-px rounded tracking-[1px] uppercase border border-rose-200 shadow-sm">
            Out of stock
          </span>
        )}
        {product.stock > 0 && product.stock <= 5 && (
          <span className="absolute top-3 right-3 bg-amber-50 text-amber-700 text-[9px] font-semibold px-2.5 py-px rounded tracking-[1px] uppercase border border-amber-200 shadow-sm animate-pulse">
            Only {product.stock} Left
          </span>
        )}

        {/* Quick Add — elegant brass accent */}
        {product.stock > 0 && (
          <button
            onClick={handleQuickAdd}
            disabled={adding}
            className="absolute bottom-3 right-3 bg-white/95 text-[var(--accent)] p-2 rounded-full shadow-sm border border-[var(--border)] hover:bg-[var(--accent)] hover:text-white hover:border-[var(--accent)] transition-all focus:outline-none disabled:opacity-60"
            title="Add to Cart"
          >
            {adding ? (
              <span className="block w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <ShoppingCart className="w-3.5 h-3.5" />
            )}
          </button>
        )}
      </div>

      {/* Content */}
      <div className="pt-4 pb-1.5 px-2 flex flex-col flex-grow">
        <span className="text-[9.5px] uppercase tracking-[1.5px] text-[var(--text-muted)] font-medium mb-1">
          {product.categoryName}
        </span>

        {/* Title */}
        <h3 className="font-redhatRegular text-[15px] md:text-[16px] leading-tight tracking-[-0.1px] text-[var(--text)] line-clamp-2 mb-2 min-h-[42px]">
          {product.name}
        </h3>

        {/* Rating */}
        <div className="flex items-center gap-1 mb-3 text-[var(--accent)]">
          {product.rating && product.rating > 0 ? (
            <>
              {Array.from({ length: 5 }).map((_, idx) => (
                <Star
                  key={idx}
                  className={`w-[13px] h-[13px] ${idx + 1 <= Math.floor(product.rating!) ? 'fill-current' : ''}`}
                  strokeWidth={0.5}
                />
              ))}
              <span className="ml-1 text-[10px] text-secondary500 tabular-nums">
                {product.rating.toFixed(1)}
                {product.reviewCount ? ` (${product.reviewCount})` : ''}
              </span>
            </>
          ) : (
            Array.from({ length: 5 }).map((_, idx) => (
              <Star key={idx} className="w-[13px] h-[13px] fill-current opacity-40" strokeWidth={0.5} />
            ))
          )}
        </div>

        <div className="mt-auto">
          <PriceDisplay
            price={product.price}
            salePrice={product.salePrice}
            discountPercent={product.discountPercent}
            size="sm"
          />
        </div>
      </div>
    </Link>
  );
};

export default ProductCard;
