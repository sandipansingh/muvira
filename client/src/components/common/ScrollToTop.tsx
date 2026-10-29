import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'

const accountPaths = new Set(['/profile', '/orders'])
const accountSections = new Set(['', '#addresses', '#personal-info'])

export const ScrollToTop = () => {
  const { pathname, search, hash } = useLocation()
  const previousLocation = useRef({ pathname, search, hash })

  useEffect(() => {
    if (!accountPaths.has(pathname)) return
    const previousRestoration = window.history.scrollRestoration
    window.history.scrollRestoration = 'manual'
    return () => {
      window.history.scrollRestoration = previousRestoration
    }
  }, [pathname])

  useEffect(() => {
    const previous = previousLocation.current
    previousLocation.current = { pathname, search, hash }
    if (
      accountPaths.has(previous.pathname) &&
      accountPaths.has(pathname) &&
      accountSections.has(previous.hash) &&
      accountSections.has(hash) &&
      previous.search === search &&
      (previous.pathname !== pathname || previous.hash !== hash)
    )
      return

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
