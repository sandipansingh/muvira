import React, { createContext, useContext, useState, useCallback } from 'react'
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react'

export interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'info'
  duration?: number
}

interface ToastContextType {
  toasts: Toast[]
  showToast: (message: string, type: Toast['type'], duration?: number) => void
  dismissToast: (id: string) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([])

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const showToast = useCallback(
    (message: string, type: Toast['type'], duration = 4000) => {
      const id = Math.random().toString(36).substring(2, 9)
      setToasts((prev) => [...prev, { id, message, type, duration }])

      setTimeout(() => {
        dismissToast(id)
      }, duration)
    },
    [dismissToast]
  )

  return (
    <ToastContext.Provider value={{ toasts, showToast, dismissToast }}>
      {children}

      {/* Toast container floating at the bottom-right */}
      <div className="fixed bottom-5 right-5 z-[999999] flex flex-col gap-2 max-w-md w-full px-4 sm:px-0 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center justify-between gap-3 p-4 rounded-xl border shadow-lg transition-all duration-300 animate-slide-in ${
              toast.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : toast.type === 'error'
                  ? 'bg-rose-50 border-rose-200 text-rose-800'
                  : 'bg-amber-50 border-amber-200 text-amber-800'
            }`}
            style={{
              animation: 'slideIn 0.25s ease-out forwards',
            }}
          >
            <div className="flex items-center gap-2.5">
              {toast.type === 'success' && (
                <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
              )}
              {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />}
              {toast.type === 'info' && <Info className="w-5 h-5 text-amber-600 shrink-0" />}
              <span className="text-sm font-medium tracking-wide">{toast.message}</span>
            </div>
            <button
              onClick={() => dismissToast(toast.id)}
              className="text-gray-400 hover:text-gray-600 focus:outline-none transition-colors p-0.5 rounded-full hover:bg-black/5"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Embedded CSS for Toast Keyframe Animations */}
      <style>{`
        @keyframes slideIn {
          from {
            transform: translateY(1rem);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `}</style>
    </ToastContext.Provider>
  )
}

export const useToast = () => {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}
