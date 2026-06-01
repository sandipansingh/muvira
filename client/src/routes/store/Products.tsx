import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { productsApiService } from "../../lib/api/products";
import type { ProductListItem } from "../../types/product";
import ProductCard from "../../components/product/ProductCard";
import ProductFilters from "../../components/product/ProductFilters";
import ProductSort from "../../components/product/ProductSort";
import Pagination from "../../components/ui/Pagination";
import Skeleton from "../../components/ui/Skeleton";
import Breadcrumb from "../../components/layout/Breadcrumb";
import EmptyState from "../../components/shared/EmptyState";
import ErrorState from "../../components/shared/ErrorState";
import Button from "../../components/ui/Button";
import { SlidersHorizontal } from "lucide-react";

export const Products: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 12,
    total: 0,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Mobile filter drawer visibility toggle
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Sync inputs with URL params
  const category = searchParams.get("category") || "";
  const q = searchParams.get("q") || "";
  const minPrice = searchParams.get("minPrice") || "";
  const maxPrice = searchParams.get("maxPrice") || "";
  const inStock = searchParams.get("inStock") === "true";
  const sort = searchParams.get("sort") || "popularity";
  const page = parseInt(searchParams.get("page") || "1", 10);

  useEffect(() => {
    fetchProducts();
    // Scroll to top when filters or page change
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [category, q, minPrice, maxPrice, inStock, sort, page]);

  const fetchProducts = async () => {
    setLoading(true);
    setError(null);

    const queryParams: any = {
      page,
      limit: 12,
      sort,
    };

    if (category) queryParams.category = category;
    if (q) queryParams.q = q;
    if (inStock) queryParams.inStock = inStock;

    // Convert Rupees input string -> Paisa integer
    if (minPrice) queryParams.minPrice = parseFloat(minPrice) * 100;
    if (maxPrice) queryParams.maxPrice = parseFloat(maxPrice) * 100;

    const res = await productsApiService.getProducts(queryParams);
    if (res.success) {
      setProducts(res.data);
      setPagination(res.pagination);
    } else {
      setError(res.error.message || "Failed to load products");
    }
    setLoading(false);
  };

  const updateParam = (key: string, value: string | boolean | number) => {
    const updated = new URLSearchParams(searchParams);

    if (
      value === "" ||
      value === false ||
      value === undefined ||
      value === null
    ) {
      updated.delete(key);
    } else {
      updated.set(key, value.toString());
    }

    // Reset to page 1 on filter edits
    if (key !== "page") {
      updated.delete("page");
    }

    setSearchParams(updated);
  };

  const handleClearFilters = () => {
    setSearchParams(new URLSearchParams());
  };

  return (
    <div className="max-w-[1240px] mx-auto px-6 py-6 font-instrument text-left">
      <Breadcrumb items={[{ label: "Products Catalog" }]} />

      <div className="flex flex-col md:flex-row gap-6 mt-6">
        {/* FILTERS COLUMN */}
        {/* Desktop Filter Panel */}
        <div className="hidden md:block w-64 shrink-0">
          <ProductFilters
            selectedCategory={category}
            onCategoryChange={(val) => updateParam("category", val)}
            minPrice={minPrice}
            maxPrice={maxPrice}
            onPriceChange={(min, max) => {
              updateParam("minPrice", min);
              updateParam("maxPrice", max);
            }}
            inStock={inStock}
            onStockChange={(val) => updateParam("inStock", val)}
            onClear={handleClearFilters}
          />
        </div>

        {/* Mobile Filter Button and Modal panel */}
        <div className="md:hidden flex items-center justify-between w-full bg-transparent p-3.5 rounded-xl">
          <span className="text-xs font-semibold text-secondary600">
            Showing {pagination.total} product
            {pagination.total === 1 ? "" : "s"}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowMobileFilters(!showMobileFilters)}
            className="flex items-center gap-1.5 py-1.5"
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filters
          </Button>
        </div>

        {showMobileFilters && (
          <div className="md:hidden fixed inset-0 z-50 bg-black/50 p-4 flex items-center justify-center">
            <div className="bg-white rounded-xl p-5 max-w-sm w-full max-h-[85vh] overflow-y-auto relative">
              <button
                onClick={() => setShowMobileFilters(false)}
                className="absolute top-4 right-4 text-secondary500 hover:text-darkColor font-bold text-sm"
              >
                Close
              </button>
              <div className="mt-4">
                <ProductFilters
                  selectedCategory={category}
                  onCategoryChange={(val) => {
                    updateParam("category", val);
                    setShowMobileFilters(false);
                  }}
                  minPrice={minPrice}
                  maxPrice={maxPrice}
                  onPriceChange={(min, max) => {
                    updateParam("minPrice", min);
                    updateParam("maxPrice", max);
                    setShowMobileFilters(false);
                  }}
                  inStock={inStock}
                  onStockChange={(val) => {
                    updateParam("inStock", val);
                    setShowMobileFilters(false);
                  }}
                  onClear={() => {
                    handleClearFilters();
                    setShowMobileFilters(false);
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* PRODUCTS LIST GRID & HEADER */}
        <div className="flex-grow flex flex-col gap-6">
          {/* Header Row */}
          <div className="flex items-center justify-between gap-4 border-b border-secondary200 pb-4">
            <div className="hidden md:block">
              <h2 className="text-lg md:text-xl font-semibold tracking-wide text-darkColor">
                {category
                  ? category
                      .replace("-", " ")
                      .replace(/\b\w/g, (c) => c.toUpperCase())
                  : "All Designs"}
              </h2>
              <p className="text-xs text-secondary500 tracking-wide mt-1">
                Showing {products.length} of {pagination.total} product
                {pagination.total === 1 ? "" : "s"}
              </p>
            </div>

            {/* Sort Selector */}
            <div className="ml-auto">
              <ProductSort
                sort={sort}
                onSortChange={(val) => updateParam("sort", val)}
              />
            </div>
          </div>

          {/* Catalog Body */}
          {error ? (
            <ErrorState message={error} onRetry={fetchProducts} />
          ) : loading ? (
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="flex flex-col gap-2.5 p-2 bg-transparent rounded-lg"
                >
                  <Skeleton className="aspect-square w-full rounded-md" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-4 w-24" />
                </div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <EmptyState
              title="No products found"
              description={
                q
                  ? `We couldn't find any matches for "${q}". Try checking spelling or using general terms.`
                  : "No products match the selected filters. Try resetting the criteria."
              }
              actionLabel="Clear All Filters"
              onAction={handleClearFilters}
            />
          ) : (
            <>
              {/* Product Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {products.map((prod) => (
                  <ProductCard key={prod.id} product={prod} />
                ))}
              </div>

              {/* Pagination control */}
              <Pagination
                page={pagination.page}
                totalPages={pagination.totalPages}
                onPageChange={(pageVal) => updateParam("page", pageVal)}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Products;
