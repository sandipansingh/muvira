import { env } from '../config/env'

const SHIPROCKET_BASE = 'https://apiv2.shiprocket.in/v1/external'

/**
 * Attempt a Shiprocket auth call to verify connectivity.
 * Returns the token string if successful, throws on failure.
 */
export async function getToken(): Promise<string> {
  const res = await fetch(`${SHIPROCKET_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: env.SHIPROCKET_EMAIL,
      password: env.SHIPROCKET_PASSWORD,
    }),
    signal: AbortSignal.timeout(10_000),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Shiprocket auth failed (${res.status}): ${text}`)
  }

  const data = (await res.json()) as { token?: string }
  if (!data.token) throw new Error('Shiprocket auth: no token in response')
  return data.token
}
