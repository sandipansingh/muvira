import React from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export const AdminGuard: React.FC = () => {
  const { user, loading, isAdmin, profileError, retryProfile, logout } = useAuth()
  const location = useLocation()

  if (loading) return <main className="editorial-page" aria-busy="true" />
  if (profileError) {
    return (
      <main className="editorial-page flex min-h-screen items-center justify-center px-4">
        <section className="card max-w-lg space-y-4 p-6 text-center">
          <h1 className="font-display text-2xl font-bold text-ink">Admin profile unavailable</h1>
          <p className="text-base text-ink-soft">{profileError}</p>
          <button className="button-primary px-5 py-3" onClick={() => void retryProfile()}>
            Retry
          </button>
          <button className="button-secondary px-5 py-3" onClick={() => void logout()}>
            Sign out
          </button>
        </section>
      </main>
    )
  }
  if (!user) {
    return <Navigate to={`/signin?returnTo=${encodeURIComponent(location.pathname)}`} replace />
  }
  if (!isAdmin) return <Navigate to="/" replace />
  return <Outlet />
}
