import React, { useEffect, useRef, useState } from 'react'
import { Modal } from '../common/Modal'

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
      maxWidth={wide ? 'xl' : 'lg'}
    >
      <div
        hidden={discarding}
        onChangeCapture={() => setDirty(true)}
        onClickCapture={(event) => {
          if ((event.target as HTMLElement).closest('[role=menuitem], [role=option]'))
            setDirty(true)
        }}
      >
        {children}
        {cancelLabel && (
          <button
            type="button"
            disabled={busy}
            className="button-secondary mt-4"
            onClick={requestClose}
          >
            {cancelLabel}
          </button>
        )}
      </div>
      {discarding && (
        <div className="space-y-5">
          <p className="text-sm text-muted">
            Your unsaved form changes will be lost. Changes already saved remain saved.
          </p>
          <div className="flex flex-wrap gap-3">
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
        </div>
      )}
    </Modal>
  )
}
