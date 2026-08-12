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
}

export function SegmentedControl<T extends string = string>({
  options,
  value,
  onChange,
  layoutId = 'segmented-pill',
  className = '',
  size = 'md',
}: SegmentedControlProps<T>) {
  const paddingClass = size === 'sm' ? 'py-1.5 px-3 text-xs' : 'py-2 px-5 text-sm'

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
            className={`relative ${paddingClass} rounded-xl font-semibold transition-colors duration-200 cursor-pointer z-10 ${
              isActive ? 'text-black' : 'text-neutral-500 hover:text-neutral-800'
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

export default SegmentedControl
