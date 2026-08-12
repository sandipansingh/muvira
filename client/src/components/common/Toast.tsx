import React from 'react'
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react'
import { useToast } from '../../context/ToastContext'

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToast()
  if (toasts.length === 0) return null

  return (
    <div className="pointer-events-none fixed bottom-6 right-6 z-50 flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-3">
      {toasts.map((toast) => {
        const isSuccess = toast.type === 'success'
        const isError = toast.type === 'error'
        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 rounded-2xl border p-4 text-xs shadow-premium backdrop-blur-md transition-all ${
              isSuccess
                ? 'border-emerald-200 bg-emerald-50/95 text-emerald-950'
                : isError
                  ? 'border-red-200 bg-red-50/95 text-red-950'
                  : 'border-border-light bg-white/95 text-foreground'
            }`}
          >
            <div className="mt-0.5 shrink-0">
              {isSuccess && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
              {isError && <AlertCircle className="h-4 w-4 text-red-600" />}
              {!isSuccess && !isError && <Info className="h-4 w-4 text-neutral-500" />}
            </div>
            <div className="flex-1">
              {toast.title && <h3 className="mb-0.5 font-bold">{toast.title}</h3>}
              <p className="leading-relaxed font-medium">{toast.message}</p>
            </div>
            <button
              type="button"
              onClick={() => removeToast(toast.id)}
              className="p-1 text-current opacity-60 transition-opacity hover:opacity-100 cursor-pointer"
              aria-label="Close notification"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )
      })}
    </div>
  )
}

export default ToastContainer
