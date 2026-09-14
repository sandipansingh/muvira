import { supabase } from '../supabase'

export interface ApiErrorDetails {
  code: string
  message: string
  fieldErrors?: Record<string, string[]>
  details?: unknown
}

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly fieldErrors?: Record<string, string[]>
  readonly details?: unknown

  constructor(status: number, error: ApiErrorDetails, options?: { cause?: unknown }) {
    super(error.message, options)
    this.name = 'ApiError'
    this.status = status
    this.code = error.code
    this.fieldErrors = error.fieldErrors
    this.details = error.details
  }
}

type ApiEnvelope = {
  success?: boolean
  data?: unknown
  error?: ApiErrorDetails
}

class ApiClient {
  private readonly baseUrl = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

  private async getAuthHeader(requireAuth: boolean): Promise<Record<string, string>> {
    const { data } = await supabase.auth.getSession()
    if (data.session?.access_token) {
      return { Authorization: `Bearer ${data.session.access_token}` }
    }

    if (requireAuth) {
      throw new ApiError(401, {
        code: 'AUTH_REQUIRED',
        message: 'Please sign in to continue.',
      })
    }

    return {}
  }

  private async request<T>(endpoint: string, init: RequestInit, requireAuth: boolean): Promise<T> {
    const authHeaders = await this.getAuthHeader(requireAuth)
    let response: Response

    try {
      response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...init,
        headers: {
          Accept: 'application/json',
          ...(init.body ? { 'Content-Type': 'application/json' } : {}),
          ...authHeaders,
          ...init.headers,
        },
      })
    } catch (error) {
      throw new ApiError(
        0,
        {
          code: 'NETWORK_ERROR',
          message: 'The service is unavailable. Please check your connection and try again.',
        },
        { cause: error }
      )
    }

    let body: unknown
    try {
      body = await this.parseBody(response)
    } catch (error) {
      if (response.status === 401) await supabase.auth.signOut().catch(() => undefined)
      throw error
    }
    const envelope = body as ApiEnvelope | null

    if (!response.ok || envelope?.success === false) {
      const error = envelope?.error ?? {
        code: response.status === 401 ? 'UNAUTHORIZED' : 'HTTP_ERROR',
        message: response.statusText || 'The request could not be completed.',
      }

      if (response.status === 401) {
        await supabase.auth.signOut().catch(() => undefined)
      }

      throw new ApiError(response.status, { ...error, details: envelope?.data ?? error.details })
    }

    return body as T
  }

  private async parseBody(response: Response): Promise<unknown> {
    const text = await response.text()
    if (!text) return null

    try {
      return JSON.parse(text) as unknown
    } catch {
      throw new ApiError(response.status, {
        code: 'INVALID_RESPONSE',
        message: 'The service returned an invalid response.',
      })
    }
  }

  async get<T>(endpoint: string, requireAuth = false): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' }, requireAuth)
  }

  async post<T>(endpoint: string, body?: unknown, requireAuth = false): Promise<T> {
    return this.request<T>(
      endpoint,
      { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) },
      requireAuth
    )
  }

  async patch<T>(endpoint: string, body?: unknown, requireAuth = false): Promise<T> {
    return this.request<T>(
      endpoint,
      { method: 'PATCH', body: body === undefined ? undefined : JSON.stringify(body) },
      requireAuth
    )
  }

  async put<T>(endpoint: string, body?: unknown, requireAuth = false): Promise<T> {
    return this.request<T>(
      endpoint,
      { method: 'PUT', body: body === undefined ? undefined : JSON.stringify(body) },
      requireAuth
    )
  }

  async delete<T>(endpoint: string, requireAuth = false): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' }, requireAuth)
  }

  async download(
    endpoint: string,
    requireAuth = false,
    method: 'GET' | 'POST' = 'GET'
  ): Promise<Blob> {
    const authHeaders = await this.getAuthHeader(requireAuth)
    let response: Response
    try {
      response = await fetch(`${this.baseUrl}${endpoint}`, {
        method,
        headers: { Accept: 'application/pdf', ...authHeaders },
      })
    } catch (error) {
      throw new ApiError(
        0,
        { code: 'NETWORK_ERROR', message: 'The download service is unavailable.' },
        { cause: error }
      )
    }

    if (!response.ok) {
      const body = (await this.parseBody(response).catch(() => null)) as ApiEnvelope | null
      throw new ApiError(
        response.status,
        body?.error ?? {
          code: 'DOWNLOAD_FAILED',
          message: response.statusText || 'The file could not be downloaded.',
        }
      )
    }
    if (response.headers.get('content-type')?.split(';')[0] !== 'application/pdf') {
      throw new ApiError(response.status, {
        code: 'INVALID_DOWNLOAD',
        message: 'The service returned an invalid invoice file.',
      })
    }
    const blob = await response.blob()
    if (blob.size > 10 * 1024 * 1024) {
      throw new ApiError(response.status, {
        code: 'DOWNLOAD_TOO_LARGE',
        message: 'The invoice exceeds the download size limit.',
      })
    }
    return blob
  }
}

export const api = new ApiClient()
