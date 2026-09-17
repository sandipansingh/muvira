export const PASSWORD_RECOVERY_SESSION_KEY = 'muvira_password_recovery'

function configuredOrigin(): string {
  const configured = import.meta.env.VITE_AUTH_REDIRECT_URL?.trim()
  if (!configured) return window.location.origin

  try {
    return new URL(configured).origin
  } catch {
    return window.location.origin
  }
}

export function authRedirectUrl(path: string): string {
  return new URL(path, configuredOrigin()).toString()
}

export function safeReturnPath(
  candidate: string | null | undefined,
  fallback = '/profile'
): string {
  if (!candidate) return fallback

  try {
    const decoded = decodeURIComponent(candidate)
    if (!decoded.startsWith('/') || decoded.startsWith('//')) return fallback
    const hasControlCharacter = Array.from(decoded).some((character) => {
      const code = character.charCodeAt(0)
      return code <= 31 || code === 127
    })
    if (decoded.includes('\\') || hasControlCharacter) return fallback

    const origin = typeof window === 'undefined' ? 'http://localhost' : window.location.origin
    const parsed = new URL(decoded, origin)
    if (parsed.origin !== origin) return fallback
    return `${parsed.pathname}${parsed.search}${parsed.hash}`
  } catch {
    return fallback
  }
}
