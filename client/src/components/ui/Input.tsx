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
        className={`w-full rounded-[var(--radius-control)] bg-white border px-3.5 py-2.5 text-base text-ink placeholder:text-muted transition-colors focus:outline-none disabled:cursor-not-allowed disabled:bg-surface disabled:text-disabled ${
          hasError
            ? 'border-danger focus:border-danger'
            : 'border-field-border focus:border-primary'
        } ${className}`}
        {...props}
      />
    )
  }
)

Input.displayName = 'Input'
