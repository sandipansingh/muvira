import React from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import type { AuthNavigationState } from '../../lib/types/auth'

export const AuthGuard: React.FC<{ requireAdmin?: boolean }> = ({ requireAdmin = false }) => {
  const { user, loading, isAdmin } = useAuth()
  const location = useLocation()
  if (loading) return <main className="editorial-page" aria-busy="true" />
  if (!user) {
    const returnTo = `${location.pathname}${location.search}${location.hash}`
    const background = location.pathname === '/checkout' ? '/cart' : '/'
    return (
      <Navigate
        to={background}
        replace
        state={{ authDialog: { mode: 'signin', returnTo } } satisfies AuthNavigationState}
      />
    )
  }
  if (requireAdmin && !isAdmin) return <Navigate to="/" replace />
  return <Outlet />
}
