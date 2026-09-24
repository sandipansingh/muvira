import { useEffect, useRef, type RefObject } from 'react'

const openDialogs: HTMLElement[] = []
let previousBodyOverflow = ''

export function useDialogFocus(
  isOpen: boolean,
  onClose: () => void,
  dialogRef: RefObject<HTMLElement | null>
) {
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (!isOpen || !dialogRef.current) return

    const dialog = dialogRef.current
    const previousFocus = document.activeElement as HTMLElement | null
    if (openDialogs.length === 0) {
      previousBodyOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
    }
    openDialogs.push(dialog)

    const focusable = () =>
      [
        ...dialog.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        ),
      ].filter((element) => element.getClientRects().length > 0)

    const focusFrame = requestAnimationFrame(() => (focusable()[0] ?? dialog).focus())
    const handleKeyDown = (event: KeyboardEvent) => {
      if (openDialogs[openDialogs.length - 1] !== dialog) return
      if (event.key === 'Escape') {
        event.preventDefault()
        onCloseRef.current()
      }
      if (event.key !== 'Tab') return

      const elements = focusable()
      if (elements.length === 0) {
        event.preventDefault()
        dialog.focus()
        return
      }
      const first = elements[0]
      const last = elements[elements.length - 1]
      if (!dialog.contains(document.activeElement)) {
        event.preventDefault()
        const target = event.shiftKey ? last : first
        target.focus()
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      cancelAnimationFrame(focusFrame)
      document.removeEventListener('keydown', handleKeyDown)
      const index = openDialogs.lastIndexOf(dialog)
      const wasTopDialog = index === openDialogs.length - 1
      if (index >= 0) openDialogs.splice(index, 1)
      if (openDialogs.length === 0) {
        document.body.style.overflow = previousBodyOverflow
        previousFocus?.focus()
      } else if (wasTopDialog) {
        openDialogs[openDialogs.length - 1].focus()
      }
    }
  }, [dialogRef, isOpen])
}
