import React, { useEffect } from 'react'
import { X } from 'lucide-react'

interface DialogProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl'
}

export const Dialog: React.FC<DialogProps> = ({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'md',
}) => {
  // Prevent background scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  if (!isOpen) return null

  const widthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
  }

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity animate-fade-in"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div
        className={`relative bg-white rounded-xl w-full ${widthClasses[maxWidth]} shadow-2xl overflow-hidden z-10 transition-transform duration-300`}
        style={{
          animation: 'modalSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-secondary200 bg-white">
          {title ? (
            <h3 className="text-base font-semibold tracking-wide text-darkColor">{title}</h3>
          ) : (
            <div />
          )}
          <button
            onClick={onClose}
            className="text-secondary500 hover:text-darkColor p-1 rounded-full hover:bg-lightgrayColor transition-colors focus:outline-none"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 max-h-[75vh] overflow-y-auto no-scrollbar">{children}</div>
      </div>

      {/* Styles for animations */}
      <style>{`
        @keyframes modalSlideUp {
          from {
            transform: translateY(20px) scale(0.97);
            opacity: 0;
          }
          to {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  )
}

export default Dialog
