import React from 'react'

interface SectionHeaderProps {
  title: React.ReactNode
  subtitle?: string
  badge?: string
  align?: 'left' | 'center'
  rightSlot?: React.ReactNode
  className?: string
  mobileLayout?: 'row' | 'col'
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  subtitle,
  badge,
  align = 'left',
  rightSlot,
  className = '',
  mobileLayout = 'col',
}) => {
  const isCenter = align === 'center'
  const isRow = mobileLayout === 'row'

  return (
    <div
      className={`flex ${
        isCenter
          ? 'flex-col items-center justify-center text-center mb-6 md:mb-12 gap-4 md:gap-6'
          : isRow
            ? 'flex-row items-end justify-between mb-5 md:mb-12 gap-3 md:gap-4'
            : 'flex-col md:flex-row md:items-end md:justify-between mb-6 md:mb-12 gap-4 md:gap-6'
      } ${className}`}
    >
      <div className={isCenter ? 'max-w-3xl mx-auto' : 'max-w-4xl'}>
        {badge && (
          <span className="block text-neutral-400 text-xs font-semibold uppercase tracking-wider mb-2">
            {badge}
          </span>
        )}
        <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold text-foreground tracking-tight leading-[1.1]">
          {title}
        </h2>
        {subtitle && <p className="text-muted font-normal mt-2 text-sm md:text-base">{subtitle}</p>}
      </div>

      {rightSlot && (
        <div className={`shrink-0 ${!isCenter && !isRow ? 'mt-4 md:mt-0' : ''}`}>{rightSlot}</div>
      )}
    </div>
  )
}

export default SectionHeader
