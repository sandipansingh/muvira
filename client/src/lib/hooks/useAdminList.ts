import { useCallback, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

export function useAdminList(pageKey = 'page') {
  const [params, setParams] = useSearchParams()
  const rawPage = Number(params.get(pageKey) ?? 1)
  const page = Number.isSafeInteger(rawPage) && rawPage > 0 ? rawPage : 1
  const resultsRef = useRef<HTMLDivElement>(null)
  const shouldScroll = useRef(false)
  const [revision, setRevision] = useState(0)
  const update = useCallback(
    (values: Record<string, string | number | undefined>, replace = false) => {
      setParams(
        (current) => {
          const next = new URLSearchParams(current)
          for (const [key, value] of Object.entries(values)) {
            if (value === undefined || value === '' || (key === pageKey && value === 1))
              next.delete(key)
            else next.set(key, String(value))
          }
          return next
        },
        { replace }
      )
    },
    [pageKey, setParams]
  )
  const changePage = useCallback(
    (next: number) => {
      shouldScroll.current = true
      update({ [pageKey]: next })
    },
    [pageKey, update]
  )
  const scrollToResults = useCallback(() => {
    if (shouldScroll.current) {
      resultsRef.current?.scrollIntoView({
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
          ? 'instant'
          : 'smooth',
        block: 'start',
      })
      shouldScroll.current = false
    }
  }, [])
  const reload = useCallback(() => setRevision((value) => value + 1), [])
  return { params, page, update, changePage, resultsRef, scrollToResults, revision, reload }
}
