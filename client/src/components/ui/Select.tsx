import React from 'react';

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
  ({ label, error, options, className = '', id, ...props }, ref) => {
    const selectId = id || Math.random().toString(36).substring(2, 9);

    return (
      <div className="w-full flex flex-col gap-1.5 text-left">
        {label && (
          <label htmlFor={selectId} className="text-xs font-semibold text-secondary700 tracking-wider uppercase">
            {label}
          </label>
        )}
        <div className="relative">
          <select
            id={selectId}
            ref={ref}
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
            <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
              <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
            </svg>
          </div>
        </div>
        {error && <span className="text-xs font-medium text-dangerColor">{error}</span>}
      </div>
    );
  }
);

Select.displayName = 'Select';
export default Select;
