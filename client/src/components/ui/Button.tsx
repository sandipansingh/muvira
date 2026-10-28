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
  primary: 'bg-primary text-white hover:bg-primary-hover active:bg-primary-hover',
  secondary: 'bg-white border border-line text-ink hover:bg-surface active:bg-surface',
  ghost: 'text-ink hover:bg-surface active:bg-line/50',
  inverse: 'bg-white text-ink hover:bg-surface shadow-sm active:bg-line/30',
}

const sizeStyles: Record<ButtonSize, string> = {
  xs: 'min-h-[var(--tap-target)] px-2.5 text-sm gap-1.5 rounded-[var(--radius-control)]',
  sm: 'min-h-[var(--tap-target)] px-3 text-sm gap-1.5 rounded-[var(--radius-control)]',
  md: 'min-h-[var(--tap-target)] px-3.5 text-sm gap-1.5 rounded-[var(--radius-control)]',
  lg: 'h-11 px-5 text-sm gap-2 rounded-[var(--radius-control)]',
  xl: 'h-12 px-6 text-base gap-2 rounded-[var(--radius-control)]',
  icon: 'h-11 w-11 p-0 rounded-[var(--radius-control)]',
  'icon-sm': 'h-11 w-11 p-0 rounded-[var(--radius-control)]',
  'icon-lg': 'h-11 w-11 p-0 rounded-[var(--radius-control)]',
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
        aria-busy={isLoading || undefined}
        className={`ui-button inline-flex items-center justify-center font-bold font-sans transition-colors cursor-pointer select-none disabled:opacity-50 disabled:cursor-not-allowed ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
        {...props}
      >
        <span className={`ui-button__content ${isLoading ? 'opacity-0' : ''}`}>
          {leftIcon && <span className="shrink-0 leading-none">{leftIcon}</span>}
          {children && <span className="ui-button__label">{children}</span>}
          {rightIcon && <span className="shrink-0 leading-none">{rightIcon}</span>}
        </span>
        {isLoading && (
          <Loader2 aria-hidden="true" className="ui-button__spinner h-4 w-4 animate-spin" />
        )}
      </button>
    )
  }
)

Button.displayName = 'Button'
