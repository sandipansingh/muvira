import { motion } from 'framer-motion'

export interface SegmentOption<T extends string = string> {
  label: string
  value: T
}

interface SegmentedControlProps<T extends string = string> {
  options: SegmentOption<T>[]
  value: T
  onChange: (value: T) => void
  layoutId?: string
  className?: string
  size?: 'sm' | 'md'
  variant?: 'pill' | 'underline'
}

export function SegmentedControl<T extends string = string>({
  options,
  value,
  onChange,
  layoutId = 'segmented-indicator',
  className = '',
  size = 'sm',
  variant = 'pill',
}: SegmentedControlProps<T>) {
  if (variant === 'underline') {
    const textSizeClass = size === 'sm' ? 'text-xs sm:text-sm' : 'text-sm sm:text-base'

    return (
      <div
        className={`flex items-center gap-6 sm:gap-8 overflow-x-auto no-scrollbar py-1 ${className}`}
      >
        {options.map((opt) => {
          const isActive = value === opt.value
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={`relative pb-2 cursor-pointer transition-colors duration-200 shrink-0 font-sans ${textSizeClass} ${
                isActive ? 'font-normal text-ink' : 'font-normal text-muted hover:text-ink-soft'
              }`}
            >
              <span>{opt.label}</span>
              {isActive && (
                <motion.span
                  layoutId={layoutId}
                  className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-ink rounded-full"
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}
            </button>
          )
        })}
      </div>
    )
  }

  const paddingClass = size === 'sm' ? 'py-2 px-3 text-xs' : 'py-2.5 px-4 text-xs sm:text-sm'

  return (
    <div className={`flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 ${className}`}>
      {options.map((opt) => {
        const isActive = value === opt.value
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`relative ${paddingClass} rounded-[var(--radius-control)] font-normal transition-colors duration-200 cursor-pointer shrink-0 border select-none ${
              isActive
                ? 'bg-[var(--color-ink)] text-white border-[var(--color-ink)]'
                : 'bg-[var(--color-paper)] text-[var(--color-muted)] border-[var(--color-line)] hover:bg-[var(--color-surface)]'
            }`}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

export default SegmentedControl
