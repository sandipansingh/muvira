import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

export const ScrollToTop = () => {
  const { pathname, search, hash } = useLocation()

  useEffect(() => {
    if (hash) {
      let targetId: string
      try {
        targetId = decodeURIComponent(hash.slice(1))
      } catch {
        return
      }
      const scrollToTarget = () => {
        const target = document.getElementById(targetId)
        if (!target) return false
        target.scrollIntoView({ behavior: 'instant', block: 'start' })
        return true
      }
      if (scrollToTarget()) return
      const observer = new MutationObserver(() => {
        if (scrollToTarget()) observer.disconnect()
      })
      observer.observe(document.body, { childList: true, subtree: true })
      return () => observer.disconnect()
    } else {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    }
  }, [pathname, search, hash])

  return null
}

export default ScrollToTop
