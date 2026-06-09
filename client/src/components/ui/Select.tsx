import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: SelectOption[];
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, className = '', id, onFocus, onBlur, onChange, ...props }, ref) => {
    const selectId = id || Math.random().toString(36).substring(2, 9);
    const [focused, setFocused] = useState(false);

    return (
      <div className="w-full flex flex-col gap-1.5 text-left font-instrument">
        {label && (
          <label htmlFor={selectId} className="text-xs font-semibold text-secondary700 tracking-wider uppercase">
            {label}
          </label>
        )}
        <div className="relative">
          <select
            id={selectId}
            ref={ref}
            onFocus={(e) => {
              setFocused(true);
              onFocus?.(e);
            }}
            onBlur={(e) => {
              setFocused(false);
              onBlur?.(e);
            }}
            onChange={(e) => {
              setFocused(false);
              onChange?.(e);
            }}
            className={`w-full px-4 py-2.5 text-sm text-darkColor bg-white border rounded-lg appearance-none focus:outline-none focus:ring-2 transition-all duration-200 ${
              error
                ? 'border-dangerColor focus:ring-dangerColor/30'
                : 'border-secondary300 focus:ring-primaryBg/30 focus:border-primaryBg'
            } ${className}`}
            {...props}
          >
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-secondary600">
            <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${focused ? 'rotate-180' : ''}`} />
          </div>
        </div>
        {error && <span className="text-xs font-medium text-dangerColor">{error}</span>}
      </div>
    );
  }
);

Select.displayName = 'Select';
export default Select;
