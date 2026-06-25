import { supabase } from '../supabase'
import { API_BASE_URL } from '../constants'

async function getToken(): Promise<string | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  return session?.access_token ?? null
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
    const token = await getToken()
    if (token) headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(`${API_BASE_URL}${path}`, { ...options, headers })
  // Let the caller handle non-2xx via the success/error shape
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
