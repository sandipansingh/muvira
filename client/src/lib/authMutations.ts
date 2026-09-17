import type { Profile } from './types/auth'

interface AttemptGuard {
  begin: () => number
  isCurrent: (attempt: number) => boolean
}

export function createGuardedLogout(input: {
  attempts: AttemptGuard
  isMounted: () => boolean
  signOut: () => Promise<unknown>
  clearState: () => void
  notify: () => void
}): () => Promise<void> {
  return async () => {
    const attempt = input.attempts.begin()
    await input.signOut()
    if (!input.isMounted() || !input.attempts.isCurrent(attempt)) return
    input.clearState()
    input.notify()
  }
}

export async function runGuardedProfileUpdate(input: {
  attempts: AttemptGuard
  isMounted: () => boolean
  update: () => Promise<
    { success: true; data: Profile } | { success: false; error: { message: string } }
  >
  apply: (profile: Profile) => void
  notifySuccess: () => void
  notifyError: (message: string) => void
}): Promise<boolean> {
  const attempt = input.attempts.begin()
  try {
    const response = await input.update()
    if (!input.isMounted() || !input.attempts.isCurrent(attempt)) return false
    if (!response.success) {
      input.notifyError(response.error.message)
      return false
    }
    input.apply(response.data)
    input.notifySuccess()
    return true
  } catch (error) {
    if (!input.isMounted() || !input.attempts.isCurrent(attempt)) return false
    input.notifyError(error instanceof Error ? error.message : 'Unable to update profile.')
    return false
  }
}
