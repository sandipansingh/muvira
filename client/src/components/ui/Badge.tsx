import React, { forwardRef } from 'react'

export type BadgeTone = 'neutral' | 'success' | 'danger' | 'warning'

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone
}

const toneStyles: Record<BadgeTone, string> = {
  neutral: 'bg-kit-surface text-kit-ink border-kit-line',
  success: 'bg-kit-accent-soft text-kit-ink border-kit-accent/30',
  danger: 'bg-danger-soft text-danger border-danger/30',
  warning: 'bg-warning-soft text-warning border-warning/30',
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ tone = 'neutral', className = '', children, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider border select-none ${toneStyles[tone]} ${className}`}
        {...props}
      >
        {children}
      </span>
    )
  }
)

Badge.displayName = 'Badge'
