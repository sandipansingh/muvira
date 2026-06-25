import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { productsApiService } from "../../lib/api/products";
import { reviewsApiService } from "../../lib/api/reviews";
import type {
  ProductDetail as ProductDetailType,
  ProductListItem,
  ProductReview,
  ReviewSummary,
} from "../../types/product";
import { useAuth } from "../../hooks/useAuth";
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

  // Reviews
  const { user } = useAuth();
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [reviewSummary, setReviewSummary] = useState<ReviewSummary>({ avgRating: null, totalReviews: 0 });
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [selectedRating, setSelectedRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewError, setReviewError] = useState<string | null>(null);

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

  const [isDescTextExpanded, setIsDescTextExpanded] = useState(false);

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

      // Load reviews (after product id known)
      fetchReviews(res.data.id);
    } else {
      setError(res.error.message || "Product not found.");
    }
    setLoading(false);
  };

  const fetchReviews = async (prodId: string) => {
    setReviewsLoading(true);
    const res = await reviewsApiService.getProductReviews(prodId, 1, 50);
    if (res.success) {
      setReviews(res.data);
      setReviewSummary(res.summary);
    }
    setReviewsLoading(false);
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
    <div className="max-w-[1240px] mx-auto px-6 py-6 text-left">
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
                <span className="text-xs font-medium text-secondary500 uppercase tracking-widest">
                  SKU: {product.sku}
                </span>
              </div>

              {/* Product Title */}
              <h1 className="text-xl md:text-3xl font-bold tracking-wide text-darkColor mb-2 leading-tight font-redhatMedium">
                {product.name}
              </h1>

              {/* Social rating stars - real data */}
              <div className="flex items-center gap-2 mb-4">
                <div className="flex text-primaryBg">
                  {Array.from({ length: 5 }).map((_, i) => {
                    const avg = reviewSummary.avgRating ?? 0;
                    const filled = i + 1 <= Math.floor(avg);
                    const half = !filled && i + 1 <= Math.ceil(avg) && avg % 1 !== 0;
                    return (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${filled || half ? "fill-current" : ""} stroke-current`}
                        strokeWidth={1.5}
                      />
                    );
                  })}
                </div>
                <span className="text-xs font-medium text-secondary600 mt-0.5">
                  {reviewSummary.avgRating ? reviewSummary.avgRating.toFixed(1) : "—"} / 5.0
                  {reviewSummary.totalReviews > 0 && (
                    <span className="ml-1 text-secondary400">({reviewSummary.totalReviews})</span>
                  )}
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
                    <span className="text-xs font-bold text-secondary700 uppercase tracking-widest">
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
                    <div className="text-xs md:text-sm text-secondary600 tracking-wide leading-relaxed py-1">
                      {(() => {
                        const maxLength = 180;
                        const isLong = product.description && product.description.length > maxLength;

                        if (!isLong) return product.description;

                        if (isDescTextExpanded) {
                          return (
                            <>
                              {product.description}{" "}
                              <button
                                onClick={() => setIsDescTextExpanded(false)}
                                className="text-primaryBg font-semibold hover:text-primaryHover focus:outline-none ml-1 inline-block"
                                type="button"
                              >
                                less
                              </button>
                            </>
                          );
                        }

                        return (
                          <>
                            {product.description.substring(0, maxLength)}...{" "}
                            <button
                              onClick={() => setIsDescTextExpanded(true)}
                              className="text-primaryBg font-semibold hover:text-primaryHover focus:outline-none ml-1 inline-block"
                              type="button"
                            >
                              more
                            </button>
                          </>
                        );
                      })()}
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
                      <span className="text-xs font-bold text-secondary700 uppercase tracking-widest">
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
                      <div className="divide-y divide-[#e6dfd5]/40 py-1">
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


              </div>
            </div>
          </div>

          {/* Related Products Grid */}
          {related.length > 0 && (
            <div className="border-t border-secondary200 mt-16 pt-12">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg md:text-2xl tracking-wide font-bold text-darkColor font-redhatMedium">
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

          {/* REVIEWS SECTION */}
          <div id="reviews" className="border-t border-secondary200 mt-16 pt-12">
            <div className="mb-6">
              <h2 className="text-lg md:text-2xl tracking-wide font-bold text-darkColor font-redhatMedium">
                Customer Reviews
              </h2>
              <p className="text-secondary600 text-xs md:text-sm mt-1">
                {reviewSummary.totalReviews > 0
                  ? `${reviewSummary.totalReviews} verified review${reviewSummary.totalReviews === 1 ? "" : "s"}`
                  : "Be the first to review this product"}
              </p>
            </div>

            {/* Summary + Submit Form */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 mb-8">
              {/* Summary */}
              <div className="lg:col-span-2">
                <div className="flex items-baseline gap-3">
                  <div className="text-4xl font-bold text-darkColor">
                    {reviewSummary.avgRating ? reviewSummary.avgRating.toFixed(1) : "—"}
                  </div>
                  <div className="flex text-primaryBg">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className="w-5 h-5 fill-current" strokeWidth={1} />
                    ))}
                  </div>
                </div>
                <div className="text-xs text-secondary500 mt-1">
                  Based on {reviewSummary.totalReviews} review{reviewSummary.totalReviews === 1 ? "" : "s"}
                </div>
              </div>

              {/* Submit / Write Review */}
              <div className="lg:col-span-3">
                {user ? (
                  <div className="bg-lightgrayColor/30 border border-secondary200 rounded-xl p-4">
                    <div className="text-xs font-semibold uppercase tracking-widest text-secondary600 mb-2">
                      {reviews.some((r) => r.userId === user.id) ? "Update your review" : "Write a review"}
                    </div>
                    <div className="flex gap-1 mb-3">
                      {[1, 2, 3, 4, 5].map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setSelectedRating(r)}
                          className={`p-1 transition ${selectedRating >= r ? "text-primaryBg" : "text-secondary300 hover:text-secondary400"}`}
                        >
                          <Star className="w-6 h-6" fill={selectedRating >= r ? "currentColor" : "none"} strokeWidth={1.5} />
                        </button>
                      ))}
                    </div>
                    <textarea
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      placeholder="Share your experience with this product (optional)"
                      className="w-full rounded-lg border border-secondary300 bg-white px-3 py-2 text-sm focus:outline-none focus:border-primaryBg min-h-[80px] resize-y"
                      maxLength={2000}
                    />
                    {reviewError && (
                      <p className="text-xs text-rose-600 mt-1">{reviewError}</p>
                    )}
                    <div className="mt-2 text-[10px] text-secondary400">
                      Only verified buyers with delivered orders can submit reviews.
                    </div>
                    <Button
                      onClick={async () => {
                        if (!product) return;
                        setSubmittingReview(true);
                        setReviewError(null);
                        const res = await reviewsApiService.submitReview(
                          product.id,
                          selectedRating,
                          reviewComment.trim() || null,
                        );
                        setSubmittingReview(false);
                        if (res.success) {
                          setReviewComment("");
                          // Refresh both summary + list
                          await fetchReviews(product.id);
                          // Also refresh product in case rating changed on detail object
                          const pRes = await productsApiService.getProductBySlug(product.slug);
                          if (pRes.success) setProduct(pRes.data);
                        } else {
                          const msg = res.error?.message || "Could not submit review.";
                          setReviewError(msg);
                        }
                      }}
                      loading={submittingReview}
                      className="mt-3"
                    >
                      {reviews.some((r) => r.userId === user.id) ? "Update Review" : "Submit Review"}
                    </Button>
                  </div>
                ) : (
                  <div className="text-xs text-secondary500">
                    Please <Link to="/login" className="text-primaryBg underline">log in</Link> to write a review.
                  </div>
                )}
              </div>
            </div>

            {/* Reviews List */}
            {reviewsLoading ? (
              <div className="space-y-4">
                {[1, 2].map((i) => (
                  <div key={i} className="border border-secondary200 rounded-xl p-4">
                    <Skeleton className="h-4 w-32 mb-2" />
                    <Skeleton className="h-3 w-full" />
                  </div>
                ))}
              </div>
            ) : reviews.length > 0 ? (
              <div className="space-y-4">
                {reviews.map((rev) => (
                  <div key={rev.id} className="border border-secondary200 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <div className="flex text-primaryBg">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`w-4 h-4 ${i + 1 <= rev.rating ? "fill-current" : ""}`}
                              strokeWidth={1}
                            />
                          ))}
                        </div>
                        <span className="text-xs font-medium text-secondary600">
                          {rev.userName || "Verified Buyer"}
                        </span>
                      </div>
                      <span className="text-[10px] text-secondary400">
                        {new Date(rev.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    {rev.comment && (
                      <p className="text-sm text-secondary700 whitespace-pre-wrap mt-1 leading-relaxed">
                        {rev.comment}
                      </p>
                    )}
                    <div className="text-[10px] mt-2 text-emerald-600 font-medium">Verified purchase</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-secondary500 py-4 border border-dashed border-secondary200 rounded-xl text-center">
                No reviews yet. Be the first to share your experience.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductDetail;
