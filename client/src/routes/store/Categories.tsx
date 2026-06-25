import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { categoriesApiService } from "../../lib/api/categories";
import type { Category } from "../../types/category";
import ErrorState from "../../components/shared/ErrorState";
import Skeleton from "../../components/ui/Skeleton";
import Breadcrumb from "../../components/layout/Breadcrumb";

export const Categories: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setLoading(true);
    setError(null);
    const res = await categoriesApiService.getCategories();
    if (res.success) {
      setCategories(res.data);
    } else {
      setError(res.error.message || "Failed to load categories");
    }
    setLoading(false);
  };

  if (error) {
    return (
      <div className="max-w-[1240px] mx-auto px-6 py-8">
        <ErrorState message={error} onRetry={fetchCategories} />
      </div>
    );
  }

  return (
    <div className="max-w-[1240px] mx-auto px-6 py-6 text-left">
      <Breadcrumb items={[{ label: "Categories" }]} />

      <div className="my-6">
        <h1 className="text-xl md:text-2xl font-semibold tracking-wide text-darkColor mb-2">
          Shop by Category
        </h1>
        <p className="text-xs md:text-sm text-secondary600 tracking-wide max-w-xl">
          Browse through our curated collections of handloom clothing, organic
          beddings, and handcrafted solid wood furniture.
        </p>
      </div>

      {loading ? (
        // Loading skeletons matching grid
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 my-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-3">
              <Skeleton className="h-64 rounded-xl" />
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-48" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 my-8">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              to={`/categories/${cat.slug}`}
              className="group flex flex-col bg-transparent rounded-xl overflow-hidden"
            >
              {/* Image container */}
              <div className="h-64 overflow-hidden bg-gray-100 relative">
                <img
                  src={cat.imageUrl}
                  alt={cat.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-60" />
                <span className="absolute bottom-4 left-4 text-white font-bold text-base md:text-lg tracking-wider">
                  {cat.name}
                </span>
              </div>

              {/* Description */}
              <div className="p-4 flex flex-col gap-1 flex-1">
                <p className="text-xs md:text-sm text-secondary600 tracking-wide line-clamp-2">
                  {cat.description}
                </p>
                <span className="text-xs font-semibold text-primaryBg mt-auto pt-4 flex items-center gap-1">
                  Explore Products →
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default Categories;
