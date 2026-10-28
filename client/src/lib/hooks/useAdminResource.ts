import { useCallback, useEffect, useState } from 'react'

export function useAdminResource<T>(load: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [revision, setRevision] = useState(0)
  const reload = useCallback(() => setRevision((value) => value + 1), [])
  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)
    void load()
      .then((value) => {
        if (active) setData(value)
      })
      .catch((reason) => {
        if (active)
          setError(reason instanceof Error ? reason.message : 'This section is unavailable.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [load, revision])
  return { data, error, loading, reload }
}
