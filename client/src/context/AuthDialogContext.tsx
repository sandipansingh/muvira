import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import type { AuthDialogOptions } from '../lib/types/auth'
import { safeReturnPath } from '../lib/authRedirect'
import { useAuth } from './AuthContext'
import { AuthDialog } from '../components/auth/AuthDialog'
import { useToast } from './ToastContext'

interface AuthDialogRequest extends AuthDialogOptions {
  id: number
}

interface AuthDialogController {
  openAuth: (options: AuthDialogOptions) => void
  closeAuth: () => void
}

const AuthDialogContext = createContext<AuthDialogController | undefined>(undefined)

export function AuthDialogProvider({ children }: { children: React.ReactNode }) {
  const [request, setRequest] = useState<AuthDialogRequest | null>(null)
  const activeRequest = useRef<AuthDialogRequest | null>(null)
  const generation = useRef(0)
  const handledLocations = useRef(new Set<string>())
  const lastLocation = useRef<string | null>(null)
  const { showToast } = useToast()
  const { isAuthenticated, loading } = useAuth()
  const currentAuth = useRef({ isAuthenticated, loading })
  currentAuth.current = { isAuthenticated, loading }
  const location = useLocation()
  const locationId = `${location.key}:${location.pathname}${location.search}${location.hash}`
  const navigate = useNavigate()

  const closeAuth = useCallback(() => {
    generation.current += 1
    activeRequest.current = null
    setRequest(null)
  }, [])

  const openAuth = useCallback(
    (options: AuthDialogOptions) => {
      const returnTo = options.returnTo ? safeReturnPath(options.returnTo, '/') : undefined
      if (returnTo && currentAuth.current.isAuthenticated && !currentAuth.current.loading) {
        closeAuth()
        navigate(returnTo)
        return
      }
      if (returnTo && activeRequest.current) {
        const next = { ...activeRequest.current, returnTo }
        activeRequest.current = next
        setRequest(next)
        return
      }
      const next = {
        ...options,
        returnTo,
        trigger: options.trigger ?? (document.activeElement as HTMLElement | null),
        id: ++generation.current,
      }
      activeRequest.current = next
      setRequest(next)
    },
    [closeAuth, navigate]
  )

  // Each history entry may request authentication once; ordinary navigation dismisses it.
  useEffect(() => {
    if (lastLocation.current === locationId) return
    lastLocation.current = locationId
    closeAuth()
    const state: unknown = location.state
    if (!state || typeof state !== 'object' || !('authDialog' in state)) return
    const entry = state.authDialog
    if (!entry || typeof entry !== 'object' || !('mode' in entry)) return
    if (entry.mode !== 'signin' && entry.mode !== 'signup') return
    if (handledLocations.current.has(location.key)) return
    handledLocations.current.add(location.key)
    openAuth({
      mode: entry.mode,
      returnTo:
        'returnTo' in entry && typeof entry.returnTo === 'string' ? entry.returnTo : undefined,
    })
    // Auth/cart updates must not reopen or dismiss an in-flight dialog.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationId, closeAuth])

  const completeAuth = (id: number) => {
    const current = activeRequest.current
    if (current?.id !== id) return
    showToast('You’re signed in to Muvira.', 'success')
    closeAuth()
    if (current.returnTo) navigate(current.returnTo)
  }

  const restoreFocus = () => {
    const trigger = request?.trigger
    if (
      trigger?.isConnected &&
      trigger.matches('a[href], button, input, select, textarea, [tabindex]') &&
      trigger.getClientRects().length &&
      !trigger.matches(':disabled')
    )
      return trigger
    return (
      document.querySelector<HTMLElement>(
        `[data-auth-focus="${request?.fallbackFocus ?? 'account'}"]`
      ) ?? document.querySelector<HTMLElement>('[data-auth-focus="bag"], [data-auth-focus="menu"]')
    )
  }

  return (
    <AuthDialogContext.Provider value={{ openAuth, closeAuth }}>
      {children}
      {request && (
        <AuthDialog
          key={request.id}
          mode={request.mode}
          onClose={closeAuth}
          onAuthenticated={() => completeAuth(request.id)}
          restoreFocus={restoreFocus}
        />
      )}
    </AuthDialogContext.Provider>
  )
}

export function useAuthDialog() {
  const context = useContext(AuthDialogContext)
  if (!context) throw new Error('useAuthDialog must be used within AuthDialogProvider')
  return context
}
