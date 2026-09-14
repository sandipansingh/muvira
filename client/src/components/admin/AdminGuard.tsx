import React from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export const AdminGuard: React.FC = () => {
  const { user, loading, isAdmin } = useAuth()
  const location = useLocation()

  if (loading) return <main className="editorial-page" aria-busy="true" />
  if (!user) {
    return <Navigate to={`/signin?returnTo=${encodeURIComponent(location.pathname)}`} replace />
  }
  if (!isAdmin) return <Navigate to="/" replace />
  return <Outlet />
}
