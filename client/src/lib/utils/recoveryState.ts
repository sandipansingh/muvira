export function hasValidRecoverySession(
  sessionAccessToken: string | undefined,
  markedRecoveryToken: string | null
): boolean {
  return Boolean(sessionAccessToken && markedRecoveryToken === sessionAccessToken)
}

export function validateNewPassword(password: string, confirmation: string): string | null {
  if (password.length < 8) return 'Password must contain at least 8 characters.'
  if (password !== confirmation) return 'Passwords do not match.'
  return null
}
