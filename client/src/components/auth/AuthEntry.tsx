import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { safeReturnPath } from '../../lib/authRedirect'
import type { AuthMode, AuthNavigationState } from '../../lib/types/auth'

export function AuthEntry({ mode }: { mode: AuthMode }) {
  const { search } = useLocation()
  const { loading, isAuthenticated } = useAuth()
  const returnTo = safeReturnPath(new URLSearchParams(search).get('returnTo'), '/')
  if (loading) return <main aria-busy="true" className="editorial-page" />
  if (isAuthenticated) return <Navigate to={returnTo} replace />
  return (
    <Navigate
      to="/"
      replace
      state={{ authDialog: { mode, returnTo } } satisfies AuthNavigationState}
    />
  )
}
