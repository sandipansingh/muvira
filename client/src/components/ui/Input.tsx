import React, { forwardRef } from 'react'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  hasError?: boolean
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ hasError = false, className = '', disabled, ...props }, ref) => {
    return (
      <input
        ref={ref}
        disabled={disabled}
        className={`w-full rounded-[var(--kit-radius-control)] bg-white border px-3.5 py-2.5 text-base text-kit-ink placeholder:text-kit-muted transition-colors focus:outline-none focus:ring-1 disabled:cursor-not-allowed disabled:bg-kit-surface disabled:text-kit-disabled ${
          hasError
            ? 'border-danger focus:border-danger focus:ring-danger'
            : 'border-kit-field-border focus:border-kit-ink focus:ring-kit-ink'
        } ${className}`}
        {...props}
      />
    )
  }
)

Input.displayName = 'Input'
