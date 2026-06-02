import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface ProductSortProps {
  sort: string;
  onSortChange: (sort: string) => void;
}

export const ProductSort: React.FC<ProductSortProps> = ({ sort, onSortChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const options = [
    { value: 'popularity', label: 'Best Sellers / Popularity' },
    { value: 'newest', label: 'Newest Arrivals' },
    { value: 'price_asc', label: 'Price: Low to High' },
    { value: 'price_desc', label: 'Price: High to Low' },
  ];

  const currentOption = options.find((opt) => opt.value === sort) || options[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="flex items-center gap-2.5 font-instrument relative" ref={dropdownRef}>
      <span className="text-xs font-semibold text-secondary500 uppercase tracking-wider whitespace-nowrap hidden sm:inline">
        Sort By:
      </span>
      
      <div className="relative w-48 z-40">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between pl-3.5 pr-9 py-2 text-xs font-medium text-darkColor bg-transparent border border-secondary300 rounded-lg hover:border-primaryBg transition-all focus:outline-none text-left relative cursor-pointer"
        >
          <span className="truncate mr-1">{currentOption.label}</span>
          <span className="absolute inset-y-0 right-0 flex items-center px-2.5 text-secondary600 pointer-events-none">
            {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </span>
        </button>

        {isOpen && (
          <div 
            className="absolute left-0 mt-1 w-full bg-white border border-secondary200 rounded-lg shadow-lg py-1.5 z-50 text-left"
            style={{
              animation: 'dropdownSlide 0.15s cubic-bezier(0.16, 1, 0.3, 1) forwards'
            }}
          >
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onSortChange(opt.value);
                  setIsOpen(false);
                }}
                className={`w-full px-3 py-2 text-xs text-left transition-colors font-medium cursor-pointer ${
                  opt.value === sort
                    ? 'bg-primary100 text-primaryBg font-semibold'
                    : 'text-secondary600 hover:bg-lightgrayColor hover:text-darkColor'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <style>{`
        @keyframes dropdownSlide {
          from {
            opacity: 0;
            transform: translateY(-4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default ProductSort;
