import { AppError, type AppErrorContext, type SanitizedPostgrestError } from '../types'

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null
}

export function sanitizePostgrestError(error: unknown): SanitizedPostgrestError | undefined {
  if (!error || typeof error !== 'object') return undefined

  const candidate = error as Record<string, unknown>
  const sanitized = {
    code: readString(candidate['code']),
    message: readString(candidate['message']),
    details: readString(candidate['details']),
    hint: readString(candidate['hint']),
  }

  return Object.values(sanitized).some((value) => value !== null) ? sanitized : undefined
}

export function isPostgrestNoRows(error: unknown): boolean {
  return sanitizePostgrestError(error)?.code === 'PGRST116'
}

export function databaseError(
  operation: string,
  error: unknown,
  message: string,
  options: { statusCode?: number; code?: string } = {}
): AppError {
  const context: AppErrorContext = { operation }
  const postgrest = sanitizePostgrestError(error)
  if (postgrest) context.postgrest = postgrest

  return new AppError(
    options.statusCode ?? 500,
    options.code ?? 'DB_ERROR',
    message,
    undefined,
    context
  )
}
