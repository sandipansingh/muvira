import { useEffect, useRef, type RefObject } from 'react'

const openDialogs: HTMLElement[] = []
let previousBodyOverflow = ''

export function useDialogFocus(
  isOpen: boolean,
  onClose: () => void,
  dialogRef: RefObject<HTMLElement | null>,
  restoreFocus?: () => HTMLElement | null
) {
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  const restoreFocusRef = useRef(restoreFocus)
  restoreFocusRef.current = restoreFocus

  useEffect(() => {
    if (!isOpen || !dialogRef.current) return

    const dialog = dialogRef.current
    const previousFocus = document.activeElement as HTMLElement | null
    if (openDialogs.length === 0) {
      previousBodyOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
    }
    openDialogs.push(dialog)

    const focusable = () => {
      const candidates = [
        ...dialog.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        ),
      ].filter(
        (element) =>
          element.getClientRects().length > 0 &&
          element.tabIndex >= 0 &&
          !element.matches(':disabled') &&
          !element.closest('[inert]') &&
          getComputedStyle(element).visibility !== 'hidden'
      )
      return candidates.filter((element) => {
        if (!(element instanceof HTMLInputElement) || element.type !== 'radio' || !element.name)
          return true
        const group = candidates.filter(
          (candidate): candidate is HTMLInputElement =>
            candidate instanceof HTMLInputElement &&
            candidate.type === 'radio' &&
            candidate.name === element.name &&
            candidate.form === element.form
        )
        return element === (group.find((radio) => radio.checked) ?? group[0])
      })
    }

    const focusFrame = requestAnimationFrame(() =>
      (
        dialog.querySelector<HTMLElement>('[data-dialog-initial-focus]') ??
        focusable()[0] ??
        dialog
      ).focus({ preventScroll: true })
    )
    const handleKeyDown = (event: KeyboardEvent) => {
      if (openDialogs[openDialogs.length - 1] !== dialog) return
      if (event.key === 'Escape') {
        event.preventDefault()
        onCloseRef.current()
      }
      if (event.key !== 'Tab') return

      // Safari can skip links and buttons during native Tab traversal.
      event.preventDefault()
      const elements = focusable()
      if (elements.length === 0) {
        dialog.focus()
        return
      }
      const current = elements.indexOf(document.activeElement as HTMLElement)
      const next =
        current < 0
          ? event.shiftKey
            ? elements.length - 1
            : 0
          : (current + (event.shiftKey ? -1 : 1) + elements.length) % elements.length
      elements[next].focus()
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
        const target = restoreFocusRef.current ? restoreFocusRef.current() : previousFocus
        target?.focus({ preventScroll: true })
      } else if (wasTopDialog) {
        const parentDialog = openDialogs[openDialogs.length - 1]
        const target = restoreFocusRef.current ? restoreFocusRef.current() : previousFocus
        if (target?.isConnected && parentDialog.contains(target)) {
          target.focus({ preventScroll: true })
        }
        if (!parentDialog.contains(document.activeElement)) parentDialog.focus()
      }
    }
  }, [dialogRef, isOpen])
}
