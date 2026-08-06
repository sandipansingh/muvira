import { useState, useCallback } from 'react'

export interface ToastItem {
  id: string
  message: string
  type: 'success' | 'error' | 'info'
  duration?: number
}

export interface UseToastReturn {
  toasts: ToastItem[]
  showToast: (message: string, type: ToastItem['type'], duration?: number) => void
  dismissToast: (id: string) => void
}

/**
 * Business logic hook for toast notification state queue.
 * Contains zero UI components, HTML elements, or JSX rendering logic.
 */
export function useToast(): UseToastReturn {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const showToast = useCallback(
    (message: string, type: ToastItem['type'], duration = 4000) => {
      const id = Math.random().toString(36).substring(2, 9)
      setToasts((prev) => [...prev, { id, message, type, duration }])

      setTimeout(() => {
        dismissToast(id)
      }, duration)
    },
    [dismissToast]
  )

  return { toasts, showToast, dismissToast }
}
