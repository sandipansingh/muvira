import { createHash } from 'crypto'

export function hashQueryParams(params: Record<string, unknown>): string {
  // Filter out noise: undefined values and blank strings
  const cleaned = Object.fromEntries(
    Object.entries(params)
      .filter(([, v]) => v !== undefined && v !== '')
      .sort(([a], [b]) => a.localeCompare(b))
  )

  const canonical = JSON.stringify(cleaned)

  // MD5 via Node's built-in crypto — no external package required
  return createHash('md5').update(canonical).digest('hex').slice(0, 8)
}
