import React, { forwardRef } from 'react'
import { Loader2 } from 'lucide-react'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost'
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  isLoading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'bg-kit-ink text-white hover:bg-black active:bg-black',
  secondary:
    'bg-white border border-kit-line text-kit-ink hover:border-kit-field-border active:bg-kit-surface',
  ghost: 'text-kit-ink hover:bg-kit-surface active:bg-kit-line/50',
}

const sizeStyles: Record<ButtonSize, string> = {
  xs: 'h-7 px-2.5 text-xs gap-1.5 rounded-[var(--kit-radius-control)]',
  sm: 'h-9 px-3.5 text-xs gap-1.5 rounded-[var(--kit-radius-control)]',
  md: 'h-10 px-4 text-sm gap-2 rounded-[var(--kit-radius-control)]',
  lg: 'h-12 px-6 text-sm gap-2 rounded-[var(--kit-radius-control)]',
  xl: 'h-14 px-8 text-base gap-2.5 rounded-[var(--kit-radius-control)]',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      className = '',
      disabled,
      children,
      type = 'button',
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        className={`inline-flex items-center justify-center font-semibold font-sans transition-colors cursor-pointer select-none disabled:opacity-50 disabled:cursor-not-allowed ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
        ) : (
          leftIcon && <span className="shrink-0 leading-none">{leftIcon}</span>
        )}
        {children && <span className="leading-none">{children}</span>}
        {!isLoading && rightIcon && <span className="shrink-0 leading-none">{rightIcon}</span>}
      </button>
    )
  }
)

Button.displayName = 'Button'
