import React, { forwardRef } from 'react'
import { ChevronDown } from 'lucide-react'

export interface SelectOption {
  value: string | number
  label: React.ReactNode
  disabled?: boolean
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  hasError?: boolean
  errorMessage?: string
  options?: SelectOption[]
  placeholder?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      hasError = false,
      errorMessage,
      options,
      placeholder,
      className = '',
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const isError = hasError || Boolean(errorMessage)

    return (
      <div className="relative inline-block w-full">
        <select
          ref={ref}
          disabled={disabled}
          className={`w-full appearance-none rounded-[var(--radius-control)] bg-white border px-3.5 py-2.5 pr-9 text-base text-ink transition-colors focus:outline-none disabled:cursor-not-allowed disabled:bg-surface disabled:text-disabled cursor-pointer ${
            isError ? 'border-danger' : 'border-field-border'
          } ${className}`}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options
            ? options.map((option) => (
                <option key={String(option.value)} value={option.value} disabled={option.disabled}>
                  {option.label}
                </option>
              ))
            : children}
        </select>
        <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted">
          <ChevronDown className="h-4 w-4 shrink-0" />
        </div>
        {errorMessage && <p className="mt-1 text-xs text-danger">{errorMessage}</p>}
      </div>
    )
  }
)

Select.displayName = 'Select'
