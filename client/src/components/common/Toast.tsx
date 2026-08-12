import React from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react'
import { useToast } from '../../context/ToastContext'

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToast()

  return (
    <div
      className="pointer-events-none fixed top-5 right-5 z-[9999] flex w-[min(24rem,calc(100vw-2.5rem))] flex-col gap-3"
      aria-live="polite"
    >
      <AnimatePresence>
        {toasts.map((toast) => {
          const isSuccess = toast.type === 'success'
          const isError = toast.type === 'error'

          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -15, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -15, scale: 0.95 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="pointer-events-auto flex items-center gap-3.5 rounded-[1.5rem] border border-border-light bg-white/95 p-4 shadow-premium backdrop-blur-md"
            >
              {/* Status Icon */}
              <div className="shrink-0">
                {isSuccess && (
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100">
                    <CheckCircle2 className="h-4.5 w-4.5" />
                  </div>
                )}
                {isError && (
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-red-50 text-red-600 border border-red-100">
                    <AlertCircle className="h-4.5 w-4.5" />
                  </div>
                )}
                {!isSuccess && !isError && (
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-light text-brand border border-brand/10">
                    <Info className="h-4.5 w-4.5" />
                  </div>
                )}
              </div>

              {/* Message */}
              <div className="flex-1 min-w-0">
                {toast.title && (
                  <h4 className="font-display text-xs sm:text-sm font-bold text-foreground truncate">
                    {toast.title}
                  </h4>
                )}
                <p className="font-sans text-xs text-neutral-600 font-medium leading-relaxed">
                  {toast.message}
                </p>
              </div>

              {/* Dismiss Button */}
              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border-light text-neutral-400 hover:bg-neutral-50 hover:text-neutral-700 transition-colors cursor-pointer"
                aria-label="Dismiss notification"
              >
                <X className="h-3 w-3" />
              </button>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}

export default ToastContainer
