import React, { useEffect } from 'react'
import { X } from 'lucide-react'

interface SheetProps {
  isOpen: boolean
  onClose: () => void
  side?: 'left' | 'right'
  title?: string
  children: React.ReactNode
}

export const Sheet: React.FC<SheetProps> = ({
  isOpen,
  onClose,
  side = 'left',
  title,
  children,
}) => {
  // Prevent background scroll
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

  const sideClasses = {
    left: 'left-0 h-full w-[280px] sm:w-[350px] border-r animate-slide-right',
    right: 'right-0 h-full w-[280px] sm:w-[350px] border-l animate-slide-left',
  }

  const anim =
    side === 'left' ? 'slideRight 0.3s ease-out forwards' : 'slideLeft 0.3s ease-out forwards'

  return (
    <div className="fixed inset-0 z-[99999] flex">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Drawer Content */}
      <div
        className={`fixed bg-white shadow-2xl flex flex-col z-10 border-secondary200 ${sideClasses[side]}`}
        style={{
          animation: anim,
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-secondary200">
          {title ? (
            <h3 className="text-base font-semibold tracking-wide text-darkColor">{title}</h3>
          ) : (
            <div />
          )}
          <button
            onClick={onClose}
            className="text-secondary500 hover:text-darkColor p-1 rounded-full hover:bg-lightgrayColor focus:outline-none transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto no-scrollbar p-5">{children}</div>
      </div>

      <style>{`
        @keyframes slideRight {
          from {
            transform: translateX(-100%);
          }
          to {
            transform: translateX(0);
          }
        }
        @keyframes slideLeft {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  )
}

export default Sheet
