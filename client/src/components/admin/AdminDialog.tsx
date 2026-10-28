import React, { createContext, useContext, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Modal } from '../common/Modal'

const ActionsTarget = createContext<HTMLElement | null | undefined>(undefined)

export function AdminDialogActions({ children }: { children: React.ReactNode }) {
  const target = useContext(ActionsTarget)
  if (target === undefined) return <div className="sm:col-span-2">{children}</div>
  return target ? createPortal(children, target) : null
}

export function AdminDialog({
  title,
  children,
  onClose,
  busy = false,
  revision = 0,
  wide = false,
  cancelLabel,
}: {
  title: string
  children: React.ReactNode
  onClose: () => void
  busy?: boolean
  revision?: number
  wide?: boolean
  cancelLabel?: string
}) {
  const [dirty, setDirty] = useState(false)
  const [discarding, setDiscarding] = useState(false)
  const [actionsTarget, setActionsTarget] = useState<HTMLDivElement | null>(null)
  const keepRef = useRef<HTMLButtonElement>(null)
  const lastFocus = useRef<HTMLElement | null>(null)
  useEffect(() => {
    setDirty(false)
  }, [revision])
  useEffect(() => {
    if (discarding) keepRef.current?.focus()
  }, [discarding])
  const requestClose = () => {
    if (busy) return
    if (discarding) {
      setDiscarding(false)
      return
    }
    if (dirty) {
      lastFocus.current = document.activeElement as HTMLElement
      setDiscarding(true)
    } else onClose()
  }
  return (
    <Modal
      isOpen
      title={discarding ? 'Discard unsaved changes?' : title}
      onClose={requestClose}
      presentation="drawer"
      maxWidth={wide ? 'lg' : 'md'}
      footer={
        <>
          <div ref={setActionsTarget} hidden={discarding} className="admin-dialog-actions">
            {cancelLabel && (
              <button
                type="button"
                disabled={busy}
                className="button-secondary"
                onClick={requestClose}
              >
                {cancelLabel}
              </button>
            )}
          </div>
          {discarding && (
            <div className="admin-dialog-actions">
              <button
                ref={keepRef}
                type="button"
                className="button-primary"
                onClick={() => {
                  setDiscarding(false)
                  requestAnimationFrame(() => lastFocus.current?.focus())
                }}
              >
                Keep editing
              </button>
              <button type="button" className="button-secondary text-danger" onClick={onClose}>
                Discard changes
              </button>
            </div>
          )}
        </>
      }
    >
      <ActionsTarget.Provider value={actionsTarget}>
        <div
          hidden={discarding}
          onChangeCapture={() => setDirty(true)}
          onClickCapture={(event) => {
            if ((event.target as HTMLElement).closest('[role=menuitem], [role=option]'))
              setDirty(true)
          }}
        >
          {children}
        </div>
        {discarding && (
          <div className="space-y-5">
            <p className="text-sm text-muted">
              Your unsaved form changes will be lost. Changes already saved remain saved.
            </p>
          </div>
        )}
      </ActionsTarget.Provider>
    </Modal>
  )
}
