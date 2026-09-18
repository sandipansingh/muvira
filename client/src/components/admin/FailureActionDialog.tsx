import React, { useEffect, useState } from 'react'
import { Modal } from '../common/Modal'
import { Button, Textarea } from '../ui'

interface FailureActionDialogProps {
  isOpen: boolean
  title: string
  description: string
  confirmLabel: string
  isSubmitting: boolean
  onClose: () => void
  onConfirm: (reason: string) => void
}

export const FailureActionDialog: React.FC<FailureActionDialogProps> = ({
  isOpen,
  title,
  description,
  confirmLabel,
  isSubmitting,
  onClose,
  onConfirm,
}) => {
  const [reason, setReason] = useState('')

  useEffect(() => {
    if (!isOpen) setReason('')
  }, [isOpen])

  const trimmedReason = reason.trim()

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="sm">
      <form
        onSubmit={(event) => {
          event.preventDefault()
          if (trimmedReason.length >= 3) onConfirm(trimmedReason)
        }}
        className="space-y-4"
      >
        <p className="text-sm text-ink">{description}</p>
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
            autoFocus
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting} disabled={trimmedReason.length < 3}>
            {confirmLabel}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
