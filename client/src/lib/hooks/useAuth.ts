import { useAuth as useAuthContext } from '../../context/AuthContext'

export type UseAuthReturn = ReturnType<typeof useAuthContext>

export function getEmailRedirectUrl(): string {
  const explicitRedirect = import.meta.env.VITE_AUTH_REDIRECT_URL
  if (explicitRedirect) return explicitRedirect

  if (typeof window !== 'undefined') return `${window.location.origin}/`

  return 'https://muvira.in/'
}

export function useAuth(): UseAuthReturn {
  return useAuthContext()
}
