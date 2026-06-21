import React, { useState, useEffect } from 'react';
import { categoriesMockService } from '../../mocks/categories.mock';
import type { Category } from '../../types/category';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { SlidersHorizontal, RotateCcw } from 'lucide-react';

interface ProductFiltersProps {
  selectedCategory: string;
  onCategoryChange: (catSlug: string) => void;
  minPrice: string;
  maxPrice: string;
  onPriceChange: (min: string, max: string) => void;
  inStock: boolean;
  onStockChange: (inStock: boolean) => void;
  onClear: () => void;
}

export const ProductFilters: React.FC<ProductFiltersProps> = ({
  selectedCategory,
  onCategoryChange,
  minPrice,
  maxPrice,
  onPriceChange,
  inStock,
  onStockChange,
  onClear,
}) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [minInput, setMinInput] = useState(minPrice);
  const [maxInput, setMaxInput] = useState(maxPrice);

  useEffect(() => {
    const fetchCats = async () => {
      const res = await categoriesMockService.getCategories();
      if (res.success) {
        setCategories(res.data);
      }
    };
    fetchCats();
  }, []);

  // Sync state if parent props change
  useEffect(() => {
    setMinInput(minPrice);
  }, [minPrice]);

  useEffect(() => {
    setMaxInput(maxPrice);
  }, [maxPrice]);

  const handlePriceApply = (e: React.FormEvent) => {
    e.preventDefault();
    onPriceChange(minInput, maxInput);
  };

  return (
    <div className="bg-white border border-secondary200 rounded-xl p-5 space-y-6 text-left font-redhat shrink-0">
      {/* Title */}
      <div className="flex items-center justify-between border-b border-secondary200 pb-3">
        <h3 className="text-sm font-bold text-darkColor flex items-center gap-2 tracking-wide">
          <SlidersHorizontal className="w-4 h-4 text-primaryBg" />
          Filter Products
        </h3>
        <button
          onClick={() => {
            setMinInput('');
            setMaxInput('');
            onClear();
          }}
          className="text-xs font-semibold text-secondary500 hover:text-primaryBg flex items-center gap-1.5 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset
        </button>
      </div>

      {/* Category Links */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold text-secondary700 uppercase tracking-widest pl-1">
          Categories
        </h4>
        <div className="flex flex-col gap-1 text-sm">
          <button
            onClick={() => onCategoryChange('')}
            className={`px-3 py-2 text-left rounded-lg transition-colors font-medium ${
              selectedCategory === ''
                ? 'bg-primary100 text-primaryBg font-semibold'
                : 'text-secondary600 hover:bg-lightgrayColor hover:text-darkColor'
            }`}
          >
            All Collections
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => onCategoryChange(cat.slug)}
              className={`px-3 py-2 text-left rounded-lg transition-colors font-medium ${
                selectedCategory === cat.slug
                  ? 'bg-primary100 text-primaryBg font-semibold'
                  : 'text-secondary600 hover:bg-lightgrayColor hover:text-darkColor'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Price Range inputs */}
      <div className="space-y-3 border-t border-secondary200 pt-4">
        <h4 className="text-xs font-bold text-secondary700 uppercase tracking-widest pl-1">
          Price Range (₹)
        </h4>
        <form onSubmit={handlePriceApply} className="space-y-3">
          <div className="flex gap-2">
            <Input
              type="number"
              placeholder="Min ₹"
              value={minInput}
              onChange={(e) => setMinInput(e.target.value)}
              className="px-2.5 py-1.5"
            />
            <Input
              type="number"
              placeholder="Max ₹"
              value={maxInput}
              onChange={(e) => setMaxInput(e.target.value)}
              className="px-2.5 py-1.5"
            />
          </div>
          <Button type="submit" variant="secondary" size="sm" className="w-full text-xs">
            Apply Price
          </Button>
        </form>
      </div>

      {/* Stock Availability Toggle */}
      <div className="space-y-3 border-t border-secondary200 pt-4">
        <h4 className="text-xs font-bold text-secondary700 uppercase tracking-widest pl-1">
          Availability
        </h4>
        <label className="flex items-center gap-2 px-3 py-1 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={inStock}
            onChange={(e) => onStockChange(e.target.checked)}
            className="w-4 h-4 accent-primaryBg rounded text-primaryBg cursor-pointer"
          />
          <span className="text-sm font-medium text-secondary600 hover:text-darkColor transition-colors">
            Exclude Out of Stock
          </span>
        </label>
      </div>
    </div>
  );
};

export default ProductFilters;
