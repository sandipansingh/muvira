import React from 'react';
import Select from '../ui/Select';

interface ProductSortProps {
  sort: string;
  onSortChange: (sort: string) => void;
}

export const ProductSort: React.FC<ProductSortProps> = ({ sort, onSortChange }) => {
  const options = [
    { value: 'popularity', label: 'Best Sellers / Popularity' },
    { value: 'newest', label: 'Newest Arrivals' },
    { value: 'price_asc', label: 'Price: Low to High' },
    { value: 'price_desc', label: 'Price: High to Low' },
  ];

  return (
    <div className="flex items-center gap-2.5">
      <span className="text-xs font-semibold text-secondary500 uppercase tracking-wider whitespace-nowrap hidden sm:inline">
        Sort By:
      </span>
      <Select
        options={options}
        value={sort}
        onChange={(e) => onSortChange(e.target.value)}
        className="w-48 !py-1.5 !text-xs !bg-lightgrayColor border-secondary300"
      />
    </div>
  );
};

export default ProductSort;
