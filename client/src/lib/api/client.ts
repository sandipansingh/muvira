import { supabase } from '../supabase'
import { API_BASE_URL } from '../constants'

async function getFreshToken(): Promise<string | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  return session?.access_token ?? null
}

async function forceRefreshToken(): Promise<string | null> {
  const {
    data: { session: current },
  } = await supabase.auth.getSession()
  if (!current?.refresh_token) return null

  const {
    data: { session: refreshed },
  } = await supabase.auth.refreshSession({ refresh_token: current.refresh_token })
  return refreshed?.access_token ?? null
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  requiresAuth = false
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  }

  if (requiresAuth) {
    const token = await getFreshToken()
    if (token) headers['Authorization'] = `Bearer ${token}`
  }

  const doFetch = (): Promise<Response> =>
    fetch(`${API_BASE_URL}${path}`, { ...options, headers })

  let res = await doFetch()

  // If auth required and we get a 401, try refreshing the token once
  if (requiresAuth && res.status === 401) {
    const freshToken = await forceRefreshToken()
    if (freshToken) {
      headers['Authorization'] = `Bearer ${freshToken}`
      res = await doFetch()
    }
  }

  return res.json() as Promise<T>
}

export const api = {
  get: <T>(path: string, auth = false) => request<T>(path, { method: 'GET' }, auth),

  post: <T>(path: string, body?: unknown, auth = false) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }, auth),

  patch: <T>(path: string, body?: unknown, auth = false) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }, auth),

  delete: <T>(path: string, auth = false) => request<T>(path, { method: 'DELETE' }, auth),
}
