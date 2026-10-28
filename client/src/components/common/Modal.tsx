import { motion, useReducedMotion } from 'framer-motion'
import React, { useId, useRef } from 'react'
import { X } from 'lucide-react'
import { useDialogFocus } from '../../lib/hooks/useDialogFocus'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  headerBrand?: React.ReactNode
  children: React.ReactNode
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | 'gallery'
  onKeyDown?: React.KeyboardEventHandler<HTMLDivElement>
  restoreFocus?: () => HTMLElement | null
  presentation?: 'default' | 'auth' | 'drawer'
  footer?: React.ReactNode
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  headerBrand,
  children,
  maxWidth = 'md',
  onKeyDown,
  restoreFocus,
  presentation = 'default',
  footer,
}) => {
  const reducedMotion = useReducedMotion()
  const isDrawer = presentation === 'drawer'
  const titleId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  useDialogFocus(isOpen, onClose, panelRef, restoreFocus)

  if (!isOpen) return null

  const widthClass =
    maxWidth === 'gallery'
      ? 'max-w-[90rem]'
      : maxWidth === 'sm'
        ? 'max-w-sm'
        : maxWidth === 'lg'
          ? 'max-w-2xl'
          : maxWidth === 'xl'
            ? 'max-w-4xl'
            : 'max-w-lg'

  return (
    <div
      className={
        isDrawer
          ? 'modal-drawer-layer fixed inset-0 z-[var(--z-modal)] flex justify-end'
          : 'fixed inset-0 z-[var(--z-modal)] flex items-center justify-center p-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]'
      }
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? titleId : undefined}
      aria-label={title ? undefined : 'Dialog'}
    >
      <button
        type="button"
        className="fixed inset-0 bg-black/50 backdrop-blur-xs cursor-pointer"
        onClick={onClose}
        aria-label="Close dialog"
      />
      <motion.div
        initial={reducedMotion ? false : isDrawer ? { x: '100%' } : { opacity: 0, y: 8 }}
        animate={isDrawer ? { x: 0 } : { opacity: 1, y: 0 }}
        transition={{ duration: reducedMotion ? 0 : 0.18 }}
        ref={panelRef}
        onKeyDown={onKeyDown}
        tabIndex={-1}
        className={
          isDrawer
            ? `overlay-panel modal-drawer ${maxWidth === 'lg' || maxWidth === 'xl' ? 'modal-drawer--wide' : ''}`
            : `overlay-panel relative z-10 flex max-h-[90dvh] w-full ${widthClass} flex-col overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-paper)]`
        }
      >
        {title ? (
          <div
            className={
              presentation === 'auth'
                ? 'modal-header modal-header--auth'
                : `modal-header flex shrink-0 items-center justify-between gap-3 border-b border-line ${maxWidth === 'gallery' ? 'px-3 py-3 sm:px-4' : 'px-6 py-4'}`
            }
          >
            <div className={presentation === 'auth' ? 'modal-header__identity' : 'min-w-0 flex-1'}>
              {headerBrand && <div className="modal-header__brand">{headerBrand}</div>}
              <h2
                id={titleId}
                className={
                  presentation === 'auth'
                    ? 'font-display text-xl text-center text-ink'
                    : maxWidth === 'gallery'
                      ? 'min-w-0 flex-1 line-clamp-2 font-product text-base font-semibold text-ink'
                      : 'min-w-0 font-display text-lg text-ink'
                }
              >
                {title}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="ml-auto flex h-[var(--tap-target)] w-[var(--tap-target)] shrink-0 cursor-pointer items-center justify-center rounded-[var(--radius-control)] border border-[var(--color-line)] text-[var(--color-muted)] transition-colors hover:text-[var(--color-ink)]"
              aria-label="Close dialog"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 z-20 flex h-9 w-9 cursor-pointer items-center justify-center rounded-[var(--radius-control)] border border-[var(--color-line)] bg-[var(--color-paper)] text-[var(--color-muted)] transition-colors hover:text-[var(--color-ink)]"
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        <div
          className={`modal-body min-h-0 overflow-y-auto dropdown-scrollbar ${presentation === 'auth' ? 'p-4 pt-2' : maxWidth === 'gallery' ? 'p-3 sm:p-4' : 'p-6'}`}
        >
          {children}
        </div>
        {footer && <footer className="modal-footer">{footer}</footer>}
      </motion.div>
    </div>
  )
}

export default Modal
