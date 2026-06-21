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
      className="group bg-white rounded-lg border border-secondary200 shadow-sm p-1.5 flex flex-col relative w-full text-left hover:shadow-md transition-smooth"
    >
      {/* Product Image Cover */}
      <div className="relative aspect-square w-full rounded-md overflow-hidden bg-lightgrayColor shrink-0">
        <img
          src={product.primaryImageUrl}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />

        {/* Promo tag */}
        {hasDiscount && (
          <span className="absolute top-2.5 left-2.5 bg-white/95 text-secondary700 text-[9px] font-bold px-2 py-0.5 rounded border border-secondary200 uppercase tracking-widest font-montserrat shadow-xs">
            Sale
          </span>
        )}

        {/* Quick Add Button overlay */}
        {product.stock > 0 && (
          <button
            onClick={handleQuickAdd}
            className="absolute bottom-2.5 right-2.5 bg-white/95 text-primaryBg p-2 rounded-full shadow-md hover:bg-primaryBg hover:text-white transition-all transform translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 focus:outline-none"
            title="Add to Cart"
          >
            <ShoppingCart className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Product Details Content */}
      <div className="pt-3.5 pb-2.5 px-2 flex flex-col flex-grow">
        {/* Category Label */}
        <span className="text-[10px] text-secondary500 font-semibold uppercase tracking-widest mb-1.5 block">
          {product.categoryName}
        </span>

        {/* Title Clamped to 2 lines */}
        <h3 className="text-xs md:text-sm font-semibold tracking-wide text-darkColor group-hover:text-primaryBg transition-colors line-clamp-2 min-h-[38px] mb-1.5 leading-snug font-montserrat">
          {product.name}
        </h3>

        {/* Rating Row (Social proof mock) */}
        <div className="flex items-center gap-1 mb-2">
          <div className="flex text-primaryBg shrink-0">
            {Array.from({ length: 5 }).map((_, idx) => (
              <Star
                key={idx}
                className="w-3.5 h-3.5 fill-current stroke-current"
                strokeWidth={1}
              />
            ))}
          </div>
          <span className="text-[10px] font-medium text-secondary500 font-redhat mt-0.5">
            (42 reviews)
          </span>
        </div>

        {/* Price and Discount */}
        <div className="mt-auto">
          <PriceDisplay
            price={product.price}
            salePrice={product.salePrice}
            discountPercent={product.discountPercent}
            size="sm"
          />

          {/* Out of Stock warning */}
          {product.stock <= 0 && (
            <span className="text-[9px] font-bold text-rose-600 uppercase tracking-wider mt-1.5 flex items-center gap-1">
              <span className="w-1 h-1 rounded-full bg-rose-500 shrink-0" />
              Out of stock
            </span>
          )}

          {/* Low Stock alert */}
          {product.stock > 0 && product.stock <= 5 && (
            <span className="text-[9px] font-bold text-amber-600 uppercase tracking-wider mt-1.5 flex items-center gap-1">
              <span className="w-1 h-1 rounded-full bg-amber-500 shrink-0 animate-pulse" />
              Only {product.stock} left
            </span>
          )}
        </div>
      </div>
    </Link>
  );
};

export default ProductCard;
