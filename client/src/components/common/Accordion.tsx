import React from 'react'
import { AnimatePresence, motion } from 'framer-motion'

interface AccordionItemProps {
  isOpen: boolean
  onToggle: () => void
  trigger: React.ReactNode
  children: React.ReactNode
  duration?: number
  className?: string
}

export const AccordionItem: React.FC<AccordionItemProps> = ({
  isOpen,
  onToggle,
  trigger,
  children,
  duration = 0.25,
  className = '',
}) => {
  return (
    <div className={className}>
      <div onClick={onToggle} className="cursor-pointer select-none">
        {trigger}
      </div>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default AccordionItem
