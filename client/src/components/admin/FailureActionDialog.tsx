import React, { useEffect, useId, useState } from 'react'
import { Modal } from '../common/Modal'
import { Button, Textarea } from '../ui'

interface FailureActionDialogProps {
  isOpen: boolean
  title: string
  description: string
  confirmLabel: string
  isSubmitting: boolean
  error?: string | null
  onClose: () => void
  onConfirm: (reason: string) => void
}

export const FailureActionDialog: React.FC<FailureActionDialogProps> = ({
  isOpen,
  title,
  description,
  confirmLabel,
  isSubmitting,
  error,
  onClose,
  onConfirm,
}) => {
  const formId = useId()
  const [reason, setReason] = useState('')

  useEffect(() => {
    if (!isOpen) setReason('')
  }, [isOpen])

  const trimmedReason = reason.trim()

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!isSubmitting) onClose()
      }}
      title={title}
      presentation="drawer"
      footer={
        <div className="admin-dialog-actions">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            form={formId}
            isLoading={isSubmitting}
            disabled={isSubmitting || trimmedReason.length < 3}
          >
            {confirmLabel}
          </Button>
        </div>
      }
    >
      <form
        id={formId}
        onSubmit={(event) => {
          event.preventDefault()
          if (!isSubmitting && trimmedReason.length >= 3) onConfirm(trimmedReason)
        }}
        className="space-y-4"
      >
        <p className="text-sm text-ink">{description}</p>
        {error && (
          <p role="alert" className="rounded-control bg-danger-soft p-3 text-sm text-danger">
            {error}
          </p>
        )}
        <div>
          <label htmlFor="failure-action-reason" className="mb-2 block text-sm font-bold text-ink">
            Reason
          </label>
          <Textarea
            id="failure-action-reason"
            name="reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            minLength={3}
            maxLength={1000}
            rows={4}
            required
            data-dialog-initial-focus
          />
        </div>
      </form>
    </Modal>
  )
}
