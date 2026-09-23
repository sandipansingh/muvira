import React, { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react'
import { useToast } from '../../context/ToastContext'

const MAX_VISIBLE_TOASTS = 5
const TOAST_GAP_UNHOVERED = 12
const TOAST_HEIGHT_HOVERED = 68

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToast()
  const [isHovered, setIsHovered] = useState(false)

  const visibleToasts = toasts.slice(-MAX_VISIBLE_TOASTS)
  const total = visibleToasts.length

  const renderIcon = (type: 'success' | 'error' | 'info') => {
    switch (type) {
      case 'error':
        return (
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-danger/20 bg-danger/10 text-danger">
            <AlertCircle className="h-4 w-4" />
          </div>
        )
      case 'success':
        return (
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-accent/20 bg-accent/10 text-accent">
            <CheckCircle2 className="h-4 w-4" />
          </div>
        )
      case 'info':
      default:
        return (
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-info/10 bg-info/10 text-info">
            <Info className="h-4 w-4" />
          </div>
        )
    }
  }

  if (total === 0) return null

  const containerHeight = isHovered
    ? total * TOAST_HEIGHT_HOVERED + 20
    : 72 + (total - 1) * TOAST_GAP_UNHOVERED + 10

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="pointer-events-auto fixed right-4 top-[calc(4rem+env(safe-area-inset-top))] z-[var(--z-toast)] flex select-none items-end justify-end sm:bottom-6 sm:right-6 sm:top-auto"
      style={{
        width: 'min(23.75rem, calc(100vw - 2rem))',
        height: containerHeight,
      }}
      aria-live="polite"
    >
      <div className="relative h-full w-full">
        <AnimatePresence mode="popLayout">
          {visibleToasts.map((toast, index) => {
            const offsetFromTop = total - 1 - index
            const isFront = offsetFromTop === 0

            const targetY = isHovered
              ? -offsetFromTop * TOAST_HEIGHT_HOVERED
              : -offsetFromTop * TOAST_GAP_UNHOVERED

            const targetScale = isHovered ? 1 : Math.max(0.8, 1 - offsetFromTop * 0.05)
            const targetOpacity = isHovered
              ? 1
              : offsetFromTop >= 4
                ? 0.4
                : Math.max(0.6, 1 - offsetFromTop * 0.12)

            return (
              <motion.div
                key={toast.id}
                layout
                initial={{ opacity: 0, y: 24, scale: 0.88 }}
                animate={{
                  opacity: targetOpacity,
                  y: targetY,
                  scale: targetScale,
                  zIndex: total - offsetFromTop,
                }}
                exit={{
                  opacity: 0,
                  scale: 0.8,
                  y: 16,
                  transition: { duration: 0.18, ease: 'easeIn' },
                }}
                transition={{
                  type: 'spring',
                  stiffness: 400,
                  damping: 32,
                  mass: 0.8,
                }}
                style={{
                  position: 'absolute',
                  bottom: 0,
                  right: 0,
                  transformOrigin: 'bottom center',
                }}
                className={`flex w-full items-center gap-3 rounded-2xl border border-line bg-white/95 p-3.5 backdrop-blur-md transition-shadow duration-200 ${
                  isFront || isHovered
                    ? 'shadow-[0_12px_32px_rgba(0,0,0,0.12)]'
                    : 'shadow-[0_4px_16px_rgba(0,0,0,0.06)]'
                }`}
              >
                {renderIcon(toast.type)}

                <div className="flex min-w-0 flex-1 flex-col text-left">
                  {toast.title && (
                    <span className="text-sm font-normal leading-snug text-ink">{toast.title}</span>
                  )}
                  <span className="line-clamp-2 text-sm font-normal leading-snug text-ink-soft">
                    {toast.message}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    removeToast(toast.id)
                  }}
                  className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-[var(--radius-control)] text-muted transition-colors hover:bg-surface hover:text-ink-soft"
                  aria-label="Dismiss notification"
                >
                  <X className="h-4 w-4" />
                </button>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </div>
  )
}

export default ToastContainer
