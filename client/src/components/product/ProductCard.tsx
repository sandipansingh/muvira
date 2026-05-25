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

  const handleQuickAdd = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    await addToCart(product.id, 1);
  };

  const hasDiscount = product.salePrice !== null && product.salePrice < product.price;

  return (
    <Link
      to={`/products/${product.slug}`}
      className="group bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-2.5 flex flex-col relative w-full text-left hover-lift transition-smooth"
    >
      {/* Product Image Cover */}
      <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-[var(--surface-2)] shrink-0">
        <img
          src={product.primaryImageUrl}
          alt={product.name}
          className="w-full h-full object-cover transition-all duration-[620ms] group-hover:scale-[1.065]"
          loading="lazy"
        />

        {/* Promo tag — refined */}
        {hasDiscount && (
          <span className="absolute top-3 left-3 bg-white text-[var(--text)] text-[9px] font-semibold px-2.5 py-px rounded tracking-[1px] uppercase border border-[var(--border)] shadow-sm">
            Sale
          </span>
        )}

        {/* Quick Add — elegant brass accent */}
        {product.stock > 0 && (
          <button
            onClick={handleQuickAdd}
            className="absolute bottom-3 right-3 bg-white/95 text-[var(--accent)] p-2 rounded-full shadow-sm border border-[var(--border)] hover:bg-[var(--accent)] hover:text-white hover:border-[var(--accent)] transition-all transform translate-y-1 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 focus:outline-none"
            title="Add to Cart"
          >
            <ShoppingCart className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Content */}
      <div className="pt-4 pb-1.5 px-2 flex flex-col flex-grow">
        <span className="text-[9.5px] uppercase tracking-[1.5px] text-[var(--text-muted)] font-medium mb-1">
          {product.categoryName}
        </span>

        {/* Title — elegant Playfair */}
        <h3 className="font-playfair text-[15px] md:text-[16px] leading-tight tracking-[-0.1px] text-[var(--text)] group-hover:text-[var(--accent)] transition-colors line-clamp-2 mb-2 min-h-[42px]">
          {product.name}
        </h3>

        {/* Subtle rating line */}
        <div className="flex items-center gap-1 mb-3 text-[var(--accent)]">
          {Array.from({ length: 5 }).map((_, idx) => (
            <Star key={idx} className="w-[13px] h-[13px] fill-current" strokeWidth={0.5} />
          ))}
          <span className="ml-1 text-[10px] text-[var(--text-muted)] tracking-wide font-medium">42</span>
        </div>

        <div className="mt-auto">
          <PriceDisplay
            price={product.price}
            salePrice={product.salePrice}
            discountPercent={product.discountPercent}
            size="sm"
          />

          {product.stock <= 0 && (
            <span className="mt-2 text-[9px] font-medium uppercase tracking-widest text-[var(--accent)] flex items-center gap-1">
              <span className="w-[3px] h-[3px] rounded-full bg-[var(--accent)]" /> Out of stock
            </span>
          )}
          {product.stock > 0 && product.stock <= 5 && (
            <span className="mt-2 text-[9px] font-medium uppercase tracking-widest text-[var(--text-muted)] flex items-center gap-1">
              <span className="w-[3px] h-[3px] rounded-full bg-[var(--accent-gold)] animate-pulse" /> Only {product.stock} left
            </span>
          )}
        </div>
      </div>
    </Link>
  );
};

export default ProductCard;
