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
  variant?: 'underline' | 'pill'
}

export function SegmentedControl<T extends string = string>({
  options,
  value,
  onChange,
  layoutId = 'segmented-indicator',
  className = '',
  size = 'md',
  variant = 'underline',
}: SegmentedControlProps<T>) {
  if (variant === 'pill') {
    const paddingClass = size === 'sm' ? 'py-1.5 px-3.5 text-xs' : 'py-2 px-5 text-sm'
    return (
      <div
        className={`inline-flex items-center gap-1 p-1 bg-neutral-100/80 rounded-2xl ${className}`}
      >
        {options.map((opt) => {
          const isActive = value === opt.value
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={`relative ${paddingClass} rounded-xl font-bold transition-colors duration-200 cursor-pointer z-10 ${
                isActive ? 'text-neutral-900' : 'text-neutral-500 hover:text-neutral-800'
              }`}
            >
              {isActive && (
                <motion.span
                  layoutId={layoutId}
                  className="absolute inset-0 bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.07)]"
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}
              <span className="relative z-10">{opt.label}</span>
            </button>
          )
        })}
      </div>
    )
  }

  // Underline variant (Image 3 reference: Clean text with active solid underline)
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
              isActive
                ? 'font-bold text-foreground'
                : 'font-medium text-neutral-400 hover:text-neutral-700'
            }`}
          >
            <span>{opt.label}</span>
            {isActive && (
              <motion.span
                layoutId={layoutId}
                className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-neutral-900 rounded-full"
                transition={{ type: 'spring', stiffness: 500, damping: 35 }}
              />
            )}
          </button>
        )
      })}
    </div>
  )
}

export default SegmentedControl
