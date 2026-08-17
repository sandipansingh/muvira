import React, { createContext, useContext, useState, useCallback } from 'react'

export interface ToastMessage {
  id: string
  title?: string
  message: string
  type: 'success' | 'error' | 'info'
}

interface ToastContextType {
  toasts: ToastMessage[]
  showToast: (arg1: string, arg2?: 'success' | 'error' | 'info' | string, arg3?: string) => void
  removeToast: (id: string) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const showToast = useCallback(
    (arg1: string, arg2?: 'success' | 'error' | 'info' | string, arg3?: string) => {
      let type: 'success' | 'error' | 'info' = 'success'
      let title: string | undefined
      let message = ''

      if ((arg1 === 'success' || arg1 === 'error' || arg1 === 'info') && arg3 !== undefined) {
        // motherindiatourtravels signature: showToast(type, title, message)
        type = arg1
        title = arg2
        message = arg3
      } else {
        // standard signature: showToast(message, type, title)
        message = arg1
        if (arg2 === 'success' || arg2 === 'error' || arg2 === 'info') {
          type = arg2
        }
        title = arg3
      }

      const id = Math.random().toString(36).substring(2, 9)
      setToasts((prev) => [...prev, { id, message, type, title }])
      setTimeout(() => {
        removeToast(id)
      }, 4000)
    },
    [removeToast]
  )

  return (
    <ToastContext.Provider value={{ toasts, showToast, removeToast }}>
      {children}
    </ToastContext.Provider>
  )
}

export const useToast = () => {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return ctx
}
