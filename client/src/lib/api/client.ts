import { supabase } from '../supabase'

/**
 * Lightweight API HTTP client for Muvira client services.
 */
class ApiClient {
  private baseUrl = import.meta.env.VITE_API_BASE_URL || ''

  private async getAuthHeader(): Promise<Record<string, string>> {
    const { data } = await supabase.auth.getSession()
    if (data.session?.access_token) {
      return { Authorization: `Bearer ${data.session.access_token}` }
    }
    return {}
  }

  async get<T>(endpoint: string, _requireAuth = false): Promise<T> {
    const authHeaders = await this.getAuthHeader()
    const res = await fetch(`${this.baseUrl}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
    })
    return res.json()
  }

  async post<T>(endpoint: string, body?: unknown, _requireAuth = false): Promise<T> {
    const authHeaders = await this.getAuthHeader()
    const res = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
      body: body ? JSON.stringify(body) : undefined,
    })
    return res.json()
  }

  async patch<T>(endpoint: string, body?: unknown, _requireAuth = false): Promise<T> {
    const authHeaders = await this.getAuthHeader()
    const res = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
      body: body ? JSON.stringify(body) : undefined,
    })
    return res.json()
  }

  async delete<T>(endpoint: string, _requireAuth = false): Promise<T> {
    const authHeaders = await this.getAuthHeader()
    const res = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
    })
    return res.json()
  }
}

export const api = new ApiClient()
