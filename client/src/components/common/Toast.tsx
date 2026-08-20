import React from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react'
import { useToast } from '../../context/ToastContext'

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToast()

  const renderIcon = (type: 'success' | 'error' | 'info') => {
    switch (type) {
      case 'error':
        return (
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600 border border-red-100">
            <AlertCircle className="h-4 w-4" />
          </div>
        )
      case 'success':
        return (
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100">
            <CheckCircle2 className="h-4 w-4" />
          </div>
        )
      case 'info':
      default:
        return (
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600 border border-blue-100">
            <Info className="h-4 w-4" />
          </div>
        )
    }
  }

  return (
    <div
      className="pointer-events-none fixed bottom-5 right-5 z-[99999] flex w-auto max-w-[min(21rem,calc(100vw-2.5rem))] flex-col gap-2"
      aria-live="polite"
    >
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 16, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.94 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="kit-overlay-panel pointer-events-auto flex items-center gap-2.5 rounded-[var(--kit-radius-control)] border border-[var(--kit-line)] bg-[var(--kit-paper)] py-2 pl-2.5 pr-3"
          >
            {renderIcon(toast.type)}

            <div className="flex flex-col text-left flex-1 min-w-0">
              {toast.title && (
                <span className="text-[11px] font-bold text-neutral-900 leading-tight truncate">
                  {toast.title}
                </span>
              )}
              <span className="text-xs font-medium text-neutral-700 leading-snug line-clamp-2">
                {toast.message}
              </span>
            </div>

            <button
              type="button"
              onClick={() => removeToast(toast.id)}
              className="ml-1 shrink-0 p-1 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded-full transition-colors cursor-pointer"
              aria-label="Dismiss notification"
            >
              <X className="h-3.5 w-3.5 text-neutral-400" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

export default ToastContainer
