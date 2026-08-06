import React from 'react'
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react'
import { useToast } from '../../context/ToastContext'

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToast()

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none px-4">
      {toasts.map((toast) => {
        const isSuccess = toast.type === 'success'
        const isError = toast.type === 'error'

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl shadow-lg border transition-all duration-300 transform translate-y-0 ${
              isSuccess
                ? 'bg-zinc-900 text-white border-zinc-800'
                : isError
                  ? 'bg-red-950 text-red-100 border-red-800'
                  : 'bg-white text-zinc-900 border-zinc-200'
            }`}
          >
            <div className="mt-0.5 shrink-0">
              {isSuccess && <CheckCircle2 className="w-5 h-5 text-[#C88D35]" />}
              {isError && <AlertCircle className="w-5 h-5 text-red-400" />}
              {!isSuccess && !isError && <Info className="w-5 h-5 text-zinc-500" />}
            </div>
            <div className="flex-1 text-sm">
              {toast.title && <h5 className="font-semibold mb-0.5">{toast.title}</h5>}
              <p className="leading-snug">{toast.message}</p>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-zinc-400 hover:text-white transition-colors p-1"
              aria-label="Close notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
