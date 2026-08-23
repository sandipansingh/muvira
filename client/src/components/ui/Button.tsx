import React, { forwardRef } from 'react'
import { Loader2 } from 'lucide-react'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'inverse'
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'icon' | 'icon-sm' | 'icon-lg'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  isLoading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'bg-ink text-white hover:bg-black active:bg-black',
  secondary: 'bg-white border border-line text-ink hover:border-field-border active:bg-surface',
  ghost: 'text-ink hover:bg-surface active:bg-line/50',
  inverse: 'bg-white text-ink hover:bg-surface shadow-sm active:bg-line/30',
}

const sizeStyles: Record<ButtonSize, string> = {
  xs: 'h-7 px-2.5 text-xs gap-1.5 rounded-[var(--radius-control)]',
  sm: 'h-9 px-3.5 text-xs gap-1.5 rounded-[var(--radius-control)]',
  md: 'h-10 px-4 text-sm gap-2 rounded-[var(--radius-control)]',
  lg: 'h-12 px-6 text-sm gap-2 rounded-[var(--radius-control)]',
  xl: 'h-14 px-8 text-base gap-2.5 rounded-[var(--radius-control)]',
  icon: 'h-10 w-10 p-0 rounded-full',
  'icon-sm': 'h-8 w-8 p-0 rounded-full',
  'icon-lg': 'h-12 w-12 p-0 rounded-full',
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
