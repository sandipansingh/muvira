import React, { forwardRef } from 'react'

export type BadgeTone = 'neutral' | 'success' | 'danger' | 'warning' | 'info'

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone
}

const toneStyles: Record<BadgeTone, string> = {
  neutral: 'bg-surface text-ink border-line',
  success: 'bg-accent-soft text-ink border-accent/30',
  danger: 'bg-danger-soft text-danger border-danger/30',
  warning: 'bg-warning-soft text-warning border-warning/30',
  info: 'bg-info-soft text-info border-info/30',
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ tone = 'neutral', className = '', children, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-[var(--radius-control)] text-xs font-semibold uppercase tracking-wider border select-none ${toneStyles[tone]} ${className}`}
        {...props}
      >
        {children}
      </span>
    )
  }
)

Badge.displayName = 'Badge'
