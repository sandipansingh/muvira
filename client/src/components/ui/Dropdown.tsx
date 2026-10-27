import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ChevronDown, type LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'

export interface DropdownBadge {
  text: string
  icon?: LucideIcon | React.ComponentType<{ className?: string }>
  className?: string
}

export interface DropdownOption {
  value: string
  label: string
  triggerLabel?: string
  icon?: LucideIcon | React.ComponentType<{ className?: string }>
  badge?: DropdownBadge
  divider?: boolean
  onClick?: () => void
  href?: string
}

export interface DropdownProps {
  options: DropdownOption[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  triggerClassName?: string
  menuClassName?: string
  align?: 'left' | 'right'
  icon?: LucideIcon | React.ComponentType<{ className?: string }>
  className?: string
  variant?: 'default' | 'slim' | 'navigation'
  label?: string
  id?: string
  disabled?: boolean
  'aria-label'?: string
}

export const Dropdown: React.FC<DropdownProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Select an option',
  triggerClassName = '',
  menuClassName = '',
  align = 'left',
  icon: TriggerIcon,
  className = 'w-full sm:w-auto',
  variant = 'default',
  label,
  id,
  disabled = false,
  'aria-label': ariaLabel,
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [openUpwards, setOpenUpwards] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const restoreSelectionFocus = useRef(false)
  const keyboardEdge = useRef<'first' | 'last' | null>(null)
  const reducedMotion = useReducedMotion()

  const selectedOption = options.find((opt) => opt.value === value)
  const isSlim = variant === 'slim'
  const isNavigation = variant === 'navigation'

  useLayoutEffect(() => {
    if (!isOpen || !keyboardEdge.current) return
    const items = dropdownRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]')
    items?.[keyboardEdge.current === 'last' ? items.length - 1 : 0]?.focus()
    keyboardEdge.current = null
  }, [isOpen])

  useEffect(() => {
    if (!restoreSelectionFocus.current || isOpen || disabled) return
    restoreSelectionFocus.current = false
    const focused = document.activeElement
    if (focused === document.body || dropdownRef.current?.contains(focused))
      triggerRef.current?.focus()
  }, [disabled, isOpen])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const handleToggle = () => {
    if (disabled) return
    if (!isOpen && dropdownRef.current) {
      const rect = dropdownRef.current.getBoundingClientRect()
      const viewportHeight = window.innerHeight
      const spaceBelow = viewportHeight - rect.bottom
      const spaceAbove = rect.top
      const menuEstimatedHeight = Math.min(options.length * 36 + 20, 200)
      // Default to opening downwards unless space below is genuinely cramped and space above is larger
      setOpenUpwards(spaceBelow < menuEstimatedHeight && spaceAbove > spaceBelow)
    }
    setIsOpen((prev) => !prev)
  }

  const handleOptionClick = (option: DropdownOption) => {
    if (disabled) return
    restoreSelectionFocus.current = true
    onChange(option.value)
    if (option.onClick) {
      option.onClick()
    }
    setIsOpen(false)
    triggerRef.current?.focus()
  }

  return (
    <div
      className={`relative inline-block min-w-0 max-w-full text-left ${className}`}
      ref={dropdownRef}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setIsOpen(false)
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && isOpen) {
          setIsOpen(false)
          triggerRef.current?.focus()
          event.stopPropagation()
        }
        if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
          event.preventDefault()
          if (!isOpen) {
            keyboardEdge.current = event.key === 'ArrowUp' || event.key === 'End' ? 'last' : 'first'
            handleToggle()
          } else {
            const items = Array.from(
              dropdownRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') || []
            )
            const current = items.indexOf(document.activeElement as HTMLElement)
            const next =
              event.key === 'Home'
                ? 0
                : event.key === 'End'
                  ? items.length - 1
                  : (current + (event.key === 'ArrowUp' ? -1 : 1) + items.length) % items.length
            items[next]?.focus()
          }
        }
      }}
    >
      <button
        ref={triggerRef}
        id={id}
        type="button"
        disabled={disabled}
        onClick={handleToggle}
        className={
          isNavigation
            ? `header-link gap-2 ${triggerClassName}`
            : `flex items-center justify-between gap-2 w-full cursor-pointer transition-all duration-200 focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2 border border-line bg-paper text-ink hover:bg-surface ${
                isSlim
                  ? 'rounded-[var(--radius-control)] px-3 py-1.5 text-sm font-normal'
                  : 'rounded-[var(--radius-control)] px-3.5 py-2 text-sm font-normal'
              } ${triggerClassName}`
        }
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-label={ariaLabel || label || placeholder}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1 text-left">
          {selectedOption?.icon ? (
            <selectedOption.icon className="h-3.5 w-3.5 shrink-0 text-muted" />
          ) : TriggerIcon ? (
            <TriggerIcon className="h-3.5 w-3.5 shrink-0 text-muted" />
          ) : null}
          {isNavigation ? (
            <span>{placeholder}</span>
          ) : selectedOption ? (
            <span className="truncate block flex-1">
              {label && <span className="text-muted font-normal mr-1">{label}:</span>}
              {selectedOption.triggerLabel || selectedOption.label}
            </span>
          ) : (
            <span className="truncate block flex-1 text-muted">
              {label && <span className="text-muted font-normal mr-1">{label}:</span>}
              {placeholder}
            </span>
          )}
        </div>
        <span className="block h-3.5 w-3.5 shrink-0">
          <ChevronDown
            className={`block h-full w-full text-muted transition-transform duration-200 ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </span>
      </button>

      <AnimatePresence>
        {isOpen && !disabled && (
          <motion.div
            initial={{
              opacity: 0,
              scale: reducedMotion ? 1 : 0.96,
              y: reducedMotion ? 0 : openUpwards ? 6 : -6,
            }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: openUpwards ? 6 : -6 }}
            transition={{
              type: 'spring',
              duration: 0.18,
              stiffness: 380,
              damping: 28,
            }}
            style={{ originY: openUpwards ? 1 : 0 }}
            className={`absolute z-50 rounded-xl border border-line bg-paper p-1.5 shadow-premium focus:outline-none ${
              openUpwards ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
            } ${align === 'right' ? 'right-0' : 'left-0'} ${
              menuClassName.includes('w-') ? '' : isSlim ? 'w-44' : 'w-52'
            } ${menuClassName}`}
          >
            <div
              className={`flex flex-col gap-0.5 overflow-y-auto pr-1 dropdown-scrollbar ${
                isSlim ? 'max-h-48' : 'max-h-60'
              }`}
              role="menu"
              aria-orientation="vertical"
            >
              {options.map((option, index) => {
                const OptionIcon = option.icon
                const BadgeIcon = option.badge?.icon
                const isSelected = option.value === value

                return (
                  <React.Fragment key={option.value || index}>
                    {option.divider && <div className="h-[1px] bg-line my-1 mx-2" />}

                    {isNavigation && option.href ? (
                      <Link
                        to={option.href}
                        role="menuitem"
                        onClick={() => {
                          setIsOpen(false)
                          option.onClick?.()
                        }}
                        className="flex min-h-11 items-center rounded-lg px-3 py-2 text-sm text-ink hover:bg-surface hover:text-primary"
                      >
                        {option.label}
                      </Link>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleOptionClick(option)}
                        className={`flex items-center justify-between w-full text-left transition-colors duration-150 select-none focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2 cursor-pointer rounded-lg ${
                          isSlim
                            ? 'px-2.5 py-1.5 text-sm font-normal'
                            : 'px-3 py-2 text-sm font-normal'
                        } ${
                          isSelected
                            ? 'bg-surface text-ink font-normal'
                            : 'text-ink-soft hover:bg-surface hover:text-ink'
                        }`}
                        role="menuitem"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {OptionIcon && (
                            <OptionIcon
                              className={`h-3.5 w-3.5 shrink-0 ${
                                isSelected ? 'text-ink' : 'text-muted'
                              }`}
                            />
                          )}
                          <span className="truncate">{option.label}</span>
                        </div>

                        {option.badge && (
                          <span
                            className={`flex items-center gap-1 uppercase select-none px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider ${
                              option.badge.className || 'bg-primary-soft text-primary'
                            }`}
                          >
                            {BadgeIcon && <BadgeIcon className="h-2.5 w-2.5" />}
                            <span>{option.badge.text}</span>
                          </span>
                        )}
                      </button>
                    )}
                  </React.Fragment>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default Dropdown
