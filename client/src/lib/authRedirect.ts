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
