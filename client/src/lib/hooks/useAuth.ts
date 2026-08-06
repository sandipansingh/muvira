import { useState, useEffect, useCallback } from 'react'
import type { Profile } from '../types/auth'
import { supabase } from '../supabase'
import { authApiService } from '../services/auth.service'
import { api } from '../api/client'

export interface UseAuthReturn {
  user: Profile | null
  token: string | null
  loading: boolean
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  signup: (
    email: string,
    password: string,
    fullName: string,
    phone: string
  ) => Promise<{ success: boolean; requiresConfirmation?: boolean; error?: string }>
  logout: () => Promise<void>
  updateProfile: (fullName: string, phone: string) => Promise<boolean>
  isAuthenticated: boolean
  isAdmin: boolean
}

/**
 * Resolves the email verification redirect URL dynamically.
 */
export function getEmailRedirectUrl(): string {
  const explicitRedirect = import.meta.env.VITE_AUTH_REDIRECT_URL
  if (explicitRedirect) return explicitRedirect

  if (typeof window !== 'undefined') {
    const origin = window.location.origin
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return `${origin}/`
    }
    return `${origin}/`
  }

  return 'https://muvira.in/'
}

/**
 * Business logic hook for authentication and user session state.
 * Contains zero UI components or JSX rendering logic.
 */
export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<Profile | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = useCallback(async (): Promise<Profile | null> => {
    try {
      const res = await authApiService.getProfile()
      if (res.success) return res.data
    } catch {
      // ignore - caller handles null
    }
    return null
  }, [])

  useEffect(() => {
    let mounted = true

    const restoreSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (session && mounted) {
        setToken(session.access_token)
        const profile = await fetchProfile()
        if (mounted) setUser(profile)
      }
      if (mounted) setLoading(false)
    }

    restoreSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return
      if (session) {
        setToken(session.access_token)
        const profile = await fetchProfile()
        setUser(profile)
      } else {
        setUser(null)
        setToken(null)
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [fetchProfile])

  const login = async (
    email: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> => {
    setLoading(true)
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    setLoading(false)

    if (error || !data.session) {
      return { success: false, error: error?.message || 'Login failed' }
    }

    const profile = await fetchProfile()
    setUser(profile)
    setToken(data.session.access_token)
    return { success: true }
  }

  const signup = async (
    email: string,
    password: string,
    fullName: string,
    phone: string
  ): Promise<{ success: boolean; requiresConfirmation?: boolean; error?: string }> => {
    setLoading(true)

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, phone },
        emailRedirectTo: getEmailRedirectUrl(),
      },
    })

    if (error) {
      setLoading(false)
      return { success: false, error: error.message }
    }

    if (!data.session) {
      setLoading(false)
      return { success: true, requiresConfirmation: true }
    }

    try {
      await api.patch('/api/profile', { full_name: fullName, phone }, true)
    } catch {
      // Non-fatal
    }

    const profile = await fetchProfile()
    const displayProfile: Profile = profile ?? {
      id: data.user!.id,
      fullName,
      phone,
      role: 'user',
      createdAt: new Date().toISOString(),
      email,
    }

    setUser(displayProfile)
    setToken(data.session.access_token)
    setLoading(false)
    return { success: true }
  }

  const logout = async () => {
    setLoading(true)
    await supabase.auth.signOut()
    setUser(null)
    setToken(null)
    setLoading(false)
  }

  const updateProfile = async (fullName: string, phone: string): Promise<boolean> => {
    setLoading(true)
    const res = await authApiService.updateProfile({ fullName, phone })
    setLoading(false)

    if (res.success) {
      setUser(res.data)
      return true
    }
    return false
  }

  return {
    user,
    token,
    loading,
    login,
    signup,
    logout,
    updateProfile,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
  }
}
