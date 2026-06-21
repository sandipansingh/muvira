import React, { useState } from 'react';
import { Search } from 'lucide-react';

interface SearchBarProps {
  onSearch: (query: string) => void;
  placeholder?: string;
  initialValue?: string;
  className?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  onSearch,
  placeholder = 'Search for products, categories, designs...',
  initialValue = '',
  className = '',
}) => {
  const [query, setQuery] = useState(initialValue);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(query.trim());
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={`relative w-full max-w-[500px] flex items-center ${className}`}
    >
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        className="w-full h-10 pl-4 pr-10 text-sm border border-[#DDD] rounded-radius3 text-darkColor placeholder-secondary400 focus:outline-none focus:border-primaryBg focus:ring-1 focus:ring-primaryBg/30 transition-all"
      />
      <button
        type="submit"
        className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary600 hover:text-primaryBg transition-colors"
      >
        <Search className="w-5 h-5" />
      </button>
    </form>
  );
};

export default SearchBar;
