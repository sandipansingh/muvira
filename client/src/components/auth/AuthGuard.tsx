import React from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export const AuthGuard: React.FC = () => {
  const { user, loading, profileError, retryProfile, logout } = useAuth()
  const location = useLocation()

  if (loading) return <main className="editorial-page" aria-busy="true" />
  if (profileError) {
    return (
      <main className="editorial-page flex min-h-[60vh] items-center justify-center px-4">
        <section className="card max-w-lg space-y-4 p-6 text-center">
          <h1 className="font-display text-2xl font-bold text-ink">Account profile unavailable</h1>
          <p className="text-base text-ink-soft">{profileError}</p>
          <div className="flex flex-wrap justify-center gap-3">
            <button className="button-primary px-5 py-3" onClick={() => void retryProfile()}>
              Retry
            </button>
            <button className="button-secondary px-5 py-3" onClick={() => void logout()}>
              Sign out
            </button>
          </div>
        </section>
      </main>
    )
  }
  if (!user) {
    const returnTo = `${location.pathname}${location.search}`
    return <Navigate to={`/signin?returnTo=${encodeURIComponent(returnTo)}`} replace />
  }
  return <Outlet />
}
