import React from 'react'
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react'
import { useToast } from '../../context/ToastContext'

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToast()
  if (toasts.length === 0) return null

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-[min(22rem,calc(100vw-2rem))] flex-col gap-3">
      {toasts.map((toast) => {
        const isSuccess = toast.type === 'success'
        const isError = toast.type === 'error'
        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 border p-4 text-sm ${isSuccess ? 'border-ink bg-ink text-paper' : isError ? 'border-danger bg-danger-soft text-danger' : 'border-line bg-paper text-ink'}`}
          >
            <div className="mt-0.5 shrink-0">
              {isSuccess && <CheckCircle2 className="h-5 w-5 text-cognac" />}
              {isError && <AlertCircle className="h-5 w-5" />}
              {!isSuccess && !isError && <Info className="h-5 w-5 text-muted-ink" />}
            </div>
            <div className="flex-1">
              {toast.title && <h3 className="mb-0.5 font-semibold">{toast.title}</h3>}
              <p className="leading-snug">{toast.message}</p>
            </div>
            <button
              type="button"
              onClick={() => removeToast(toast.id)}
              className="p-1 text-current opacity-60 transition-opacity hover:opacity-100"
              aria-label="Close notification"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
