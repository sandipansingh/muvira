import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { productsApiService } from "../../lib/api/products";
import type {
  ProductDetail as ProductDetailType,
  ProductListItem,
} from "../../types/product";
import PriceDisplay from "../../components/shared/PriceDisplay";
import StockBadge from "../../components/shared/StockBadge";
import ProductCard from "../../components/product/ProductCard";
import { useCart } from "../../hooks/useCart";
import Button from "../../components/ui/Button";
import Skeleton from "../../components/ui/Skeleton";
import Breadcrumb from "../../components/layout/Breadcrumb";
import ErrorState from "../../components/shared/ErrorState";
import { Star, ShoppingCart, Info, Minus, Plus, ChevronDown } from "lucide-react";

export const ProductDetail: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { addToCart } = useCart();

  const [product, setProduct] = useState<ProductDetailType | null>(null);
  const [related, setRelated] = useState<ProductListItem[]>([]);
  const [activeImageId, setActiveImageId] = useState<string>("");

  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [addingToCart, setAddingToCart] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Collapsible Accordion sections state
  const [openSections, setOpenSections] = useState({
    description: true,
    specs: true,
    shipping: false,
  });

  const toggleSection = (section: "description" | "specs" | "shipping") => {
    setOpenSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  useEffect(() => {
    if (slug) {
      fetchProductDetails();
    }
  }, [slug]);

  const fetchProductDetails = async () => {
    setLoading(true);
    setError(null);
    setQuantity(1);

    const res = await productsApiService.getProductBySlug(slug || "");
    if (res.success) {
      setProduct(res.data);
      // Set primary image active
      const primary =
        res.data.images.find((img) => img.isPrimary) || res.data.images[0];
      setActiveImageId(primary?.id || "");

      // Load related items
      const relatedRes = await productsApiService.getRelatedProducts(
        res.data.id,
      );
      if (relatedRes.success) {
        setRelated(relatedRes.data);
      }
    } else {
      setError(res.error.message || "Product not found.");
    }
    setLoading(false);
  };

  const handleAddToCart = async () => {
    if (!product) return;
    setAddingToCart(true);
    await addToCart(product.id, quantity);
    setAddingToCart(false);
  };

  const activeImage =
    product?.images.find((img) => img.id === activeImageId) ||
    product?.images[0];

  if (error) {
    return (
      <div className="max-w-[1240px] mx-auto px-6 py-8">
        <ErrorState message={error} onRetry={fetchProductDetails} />
      </div>
    );
  }

  return (
    <div className="max-w-[1240px] mx-auto px-6 py-6 font-instrument text-left">
      {/* Breadcrumb trail */}
      {!loading && product && (
        <Breadcrumb
          items={[
            {
              label: product.category.name,
              path: `/categories/${product.category.slug}`,
            },
            { label: product.name },
          ]}
        />
      )}

      {loading ? (
        // Loading skeleton
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12 my-6">
          <div className="flex flex-col gap-4">
            <Skeleton className="w-full aspect-square rounded-xl" />
            <div className="flex gap-2">
              <Skeleton className="w-20 h-20 rounded-lg" />
              <Skeleton className="w-20 h-20 rounded-lg" />
              <Skeleton className="w-20 h-20 rounded-lg" />
            </div>
          </div>
          <div className="space-y-4">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-10 w-96" />
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-12 w-64 animate-pulse" />
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-12 w-48 rounded-full" />
          </div>
        </div>
      ) : !product ? (
        <ErrorState message="Could not find design details." />
      ) : (
        <div className="my-6">
          {/* Main Layout Grid */}
          <div className="grid grid-cols-1 md:grid-cols-[minmax(0,450px)_1fr] gap-8 lg:gap-12">
            {/* LEFT COLUMN: Gallery */}
            <div className="flex flex-col gap-4">
              {/* Primary large image preview */}
              <div className="aspect-square w-full bg-lightgrayColor rounded-xl overflow-hidden border border-secondary200">
                <img
                  src={activeImage?.url}
                  alt={activeImage?.altText || product.name}
                  className="w-full h-full object-cover transition-smooth"
                />
              </div>

              {/* Sub-images clickable items */}
              {product.images.length > 1 && (
                <div className="flex gap-3 overflow-x-auto no-scrollbar py-1">
                  {product.images
                    .sort((a, b) => a.sortOrder - b.sortOrder)
                    .map((img) => (
                      <button
                        key={img.id}
                        onClick={() => setActiveImageId(img.id)}
                        className={`w-20 h-20 border rounded-lg overflow-hidden shrink-0 transition-all ${
                          activeImageId === img.id
                            ? "border-primaryBg ring-2 ring-primaryBg/30"
                            : "border-secondary200 hover:border-secondary400"
                        }`}
                      >
                        <img
                          src={img.url}
                          alt={img.altText}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                </div>
              )}
            </div>

            {/* RIGHT COLUMN: Info details */}
            <div className="flex flex-col text-left">
              {/* SKU & Category Details */}
              <div className="flex items-center gap-3 mb-2">
                <Link
                  to={`/categories/${product.category.slug}`}
                  className="text-xs font-semibold uppercase tracking-wider text-primaryBg hover:text-primaryHover hover:underline"
                >
                  {product.category.name}
                </Link>
                <span className="text-secondary300">•</span>
                <span className="text-xs font-medium text-secondary500 uppercase tracking-widest font-instrument">
                  SKU: {product.sku}
                </span>
              </div>

              {/* Product Title */}
              <h1 className="text-xl md:text-3xl font-bold tracking-wide text-darkColor mb-2 leading-tight font-playfair">
                {product.name}
              </h1>

              {/* Social rating stars */}
              <div className="flex items-center gap-2 mb-4">
                <div className="flex text-primaryBg">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className="w-4 h-4 fill-current stroke-current"
                      strokeWidth={1.5}
                    />
                  ))}
                </div>
                <span className="text-xs font-medium text-secondary600 mt-0.5 font-instrument">
                  4.8 / 5.0
                </span>
              </div>

              {/* Divider */}
              <div className="border-t border-secondary200 my-4" />

              {/* Price rows */}
              <div className="mb-5 bg-lightgrayColor/30 p-4 rounded-xl border border-secondary200/50">
                <p className="text-xs font-semibold text-secondary500 uppercase tracking-widest mb-1">
                  Offer Price
                </p>
                <PriceDisplay
                  price={product.price}
                  salePrice={product.salePrice}
                  discountPercent={product.discountPercent}
                  size="lg"
                />
              </div>

              {/* Stock Status */}
              <div className="flex items-center gap-3 mb-6">
                <span className="text-xs font-bold text-secondary700 uppercase tracking-widest">
                  Status:
                </span>
                <StockBadge stock={product.stock} />
              </div>

              {/* Add to Cart Actions */}
              {product.stock > 0 ? (
                <div className="flex items-center gap-4 mb-8">
                  {/* Quantity selector buttons */}
                  <div className="flex items-center border border-secondary300 rounded-full bg-white p-1">
                    <button
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      disabled={quantity <= 1 || addingToCart}
                      className="w-8 h-8 rounded-full flex items-center justify-center text-secondary600 hover:bg-lightgrayColor disabled:opacity-40 transition-colors focus:outline-none"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-8 text-center text-sm font-semibold text-darkColor">
                      {quantity}
                    </span>
                    <button
                      onClick={() =>
                        setQuantity((q) => Math.min(product.stock, q + 1))
                      }
                      disabled={quantity >= product.stock || addingToCart}
                      className="w-8 h-8 rounded-full flex items-center justify-center text-secondary600 hover:bg-lightgrayColor disabled:opacity-40 transition-colors focus:outline-none"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  <Button
                    onClick={handleAddToCart}
                    loading={addingToCart}
                    className="flex-1 max-w-[280px] flex items-center justify-center gap-2"
                  >
                    <ShoppingCart className="w-4 h-4" />
                    Add to Cart
                  </Button>
                </div>
              ) : (
                <div className="p-4 bg-rose-50/50 border border-rose-100 rounded-xl mb-8 flex items-start gap-2.5">
                  <Info className="w-5 h-5 text-dangerColor shrink-0 mt-0.5" />
                  <div className="text-xs leading-relaxed text-rose-800">
                    This item is currently out of stock. We are craft-restocking
                    it soon. Click the store pins to inquire or check similar
                    designs.
                  </div>
                </div>
              )}

              {/* Accordion Sections (Description, Specifications, Shipping) */}
              <div className="border-t border-[#e6dfd5] mt-8 divide-y divide-[#e6dfd5] text-left">
                {/* Description Panel */}
                <div className="py-4">
                  <button
                    onClick={() => toggleSection("description")}
                    className="w-full flex justify-between items-center text-left py-1.5 focus:outline-none"
                    type="button"
                  >
                    <span className="text-xs font-bold text-secondary700 uppercase tracking-widest font-instrument">
                      Description
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 text-secondary500 transition-transform duration-300 ${
                        openSections.description ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  <div
                    className={`overflow-hidden transition-all duration-300 ${
                      openSections.description ? "max-h-[800px] opacity-100 mt-2" : "max-h-0 opacity-0 pointer-events-none"
                    }`}
                  >
                    <div className="text-xs md:text-sm text-secondary600 tracking-wide leading-relaxed py-1 font-instrument">
                      {product.description}
                    </div>
                  </div>
                </div>

                {/* Specifications Panel */}
                {Object.keys(product.metadata).length > 0 && (
                  <div className="py-4">
                    <button
                      onClick={() => toggleSection("specs")}
                      className="w-full flex justify-between items-center text-left py-1.5 focus:outline-none"
                      type="button"
                    >
                      <span className="text-xs font-bold text-secondary700 uppercase tracking-widest font-instrument">
                        Specifications
                      </span>
                      <ChevronDown
                        className={`w-4 h-4 text-secondary500 transition-transform duration-300 ${
                          openSections.specs ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                    <div
                      className={`overflow-hidden transition-all duration-300 ${
                        openSections.specs ? "max-h-[800px] opacity-100 mt-2" : "max-h-0 opacity-0 pointer-events-none"
                      }`}
                    >
                      <div className="divide-y divide-[#e6dfd5]/40 py-1 font-instrument">
                        {Object.entries(product.metadata).map(([key, val]) => (
                          <div
                            key={key}
                            className="grid grid-cols-3 gap-4 py-3 text-xs md:text-sm"
                          >
                            <span className="col-span-1 text-secondary500 capitalize font-medium">
                              {key}
                            </span>
                            <span className="col-span-2 font-semibold text-darkColor">
                              {val}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Shipping & Returns Panel */}
                <div className="py-4">
                  <button
                    onClick={() => toggleSection("shipping")}
                    className="w-full flex justify-between items-center text-left py-1.5 focus:outline-none"
                    type="button"
                  >
                    <span className="text-xs font-bold text-secondary700 uppercase tracking-widest font-instrument">
                      Shipping & Heritage Care
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 text-secondary500 transition-transform duration-300 ${
                        openSections.shipping ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  <div
                    className={`overflow-hidden transition-all duration-300 ${
                      openSections.shipping ? "max-h-[400px] opacity-100 mt-2" : "max-h-0 opacity-0 pointer-events-none"
                    }`}
                  >
                    <div className="text-xs text-secondary600 tracking-wide leading-relaxed py-2 space-y-2.5 font-instrument">
                      <p>
                        Each design is custom-crafted to order by local heritage
                        artisans. Standard shipping and delivery takes 7-14
                        business days.
                      </p>
                      <p>
                        <strong>Product Care:</strong> Wipe clean with a soft
                        dry cloth. Avoid harsh chemicals, direct sunlight, or excess
                        moisture to preserve the natural grain and craftsmanship.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Related Products Grid */}
          {related.length > 0 && (
            <div className="border-t border-secondary200 mt-16 pt-12">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg md:text-2xl tracking-wide font-bold text-darkColor font-playfair">
                    Discover More Designs
                  </h2>
                  <p className="hidden md:block text-secondary600 tracking-wide text-xs md:text-sm mt-1">
                    Similar collections handpicked for your taste
                  </p>
                </div>
                <Link
                  to={`/categories/${product.category.slug}`}
                  className="rounded-full bg-white border border-secondary400 px-4 py-1.5 text-xs font-semibold tracking-wider uppercase text-secondary600 hover:text-primaryBg hover:border-primaryBg transition-all"
                >
                  View All Related
                </Link>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {related.map((prod) => (
                  <ProductCard key={prod.id} product={prod} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ProductDetail;
