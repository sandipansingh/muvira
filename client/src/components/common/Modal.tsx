import React, { useEffect } from 'react'
import { X } from 'lucide-react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl'
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'md',
}) => {
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  if (!isOpen) return null

  const widthClass =
    maxWidth === 'sm'
      ? 'max-w-sm'
      : maxWidth === 'lg'
        ? 'max-w-2xl'
        : maxWidth === 'xl'
          ? 'max-w-4xl'
          : 'max-w-lg'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        className="fixed inset-0 bg-black/50 backdrop-blur-xs cursor-pointer"
        onClick={onClose}
        aria-label="Close dialog"
      />
      <div
        className={`relative z-10 flex max-h-[90vh] w-full ${widthClass} flex-col overflow-hidden rounded-[2rem] border border-border-light bg-white shadow-2xl`}
      >
        {title ? (
          <div className="flex items-center justify-between border-b border-border-light px-6 py-4">
            <h2 className="font-display text-lg font-bold text-foreground">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full border border-border-light text-neutral-500 hover:bg-neutral-50 hover:text-foreground transition-colors cursor-pointer"
              aria-label="Close dialog"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 z-20 p-2 rounded-full border border-border-light bg-white/90 backdrop-blur-xs text-neutral-500 hover:bg-neutral-50 hover:text-foreground transition-colors cursor-pointer shadow-xs"
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        <div className="overflow-y-auto p-6 dropdown-scrollbar">{children}</div>
      </div>
    </div>
  )
}

export default Modal
