import { useCallback, useEffect, useState } from 'react'

export function useStickyPanel() {
  const [panel, setPanel] = useState<HTMLElement | null>(null)
  const panelRef = useCallback((element: HTMLElement | null) => setPanel(element), [])
  const [canStick, setCanStick] = useState(false)
  useEffect(() => {
    const header = document.querySelector('.store-header')
    if (!panel) return
    const measure = () =>
      setCanStick(
        panel.getBoundingClientRect().height + (header?.getBoundingClientRect().height || 0) + 48 <
          window.innerHeight
      )
    const observer = new ResizeObserver(measure)
    observer.observe(panel)
    if (header) observer.observe(header)
    window.addEventListener('resize', measure)
    measure()
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [panel])
  return { panelRef, canStick }
}
