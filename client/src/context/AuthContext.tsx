import React, { createContext, useContext, useState, useEffect } from 'react'
import type { Profile } from '../types/auth'
import { supabase } from '../lib/supabase'
import { api } from '../lib/api/client'
import { mapProfile } from '../lib/api/adapters'
import { useToast } from './ToastContext'

interface AuthContextType {
  user: Profile | null
  token: string | null
  loading: boolean
  login: (email: string, password: string) => Promise<boolean>
  signup: (email: string, password: string, fullName: string, phone: string) => Promise<boolean>
  logout: () => Promise<void>
  updateProfile: (fullName: string, phone: string) => Promise<boolean>
  isAuthenticated: boolean
  isAdmin: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

async function fetchProfile(_token: string): Promise<Profile | null> {
  try {
    const res = await api.get<{
      success: boolean
      data?: Record<string, unknown>
    }>('/api/profile', true)
    if (res.success && res.data) return mapProfile(res.data)
  } catch {
    // ignore — caller handles null
  }
  return null
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<Profile | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const { showToast } = useToast()

  // Restore session on mount and subscribe to Supabase auth state changes
  useEffect(() => {
    let mounted = true

    const restoreSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (session && mounted) {
        setToken(session.access_token)
        const profile = await fetchProfile(session.access_token)
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
        const profile = await fetchProfile(session.access_token)
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
  }, [])

  const login = async (email: string, password: string): Promise<boolean> => {
    setLoading(true)
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    setLoading(false)

    if (error || !data.session) {
      showToast(error?.message || 'Login failed. Please check your credentials.', 'error')
      return false
    }

    const profile = await fetchProfile(data.session.access_token)
    setUser(profile)
    setToken(data.session.access_token)
    showToast(`Welcome back, ${profile?.fullName || email}!`, 'success')
    return true
  }

  const signup = async (
    email: string,
    password: string,
    fullName: string,
    phone: string
  ): Promise<boolean> => {
    setLoading(true)

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          phone: phone,
        },
      },
    })
    if (error) {
      setLoading(false)
      showToast(error.message || 'Signup failed', 'error')
      return false
    }

    // If email confirmation is required, Supabase returns a user but no session
    if (!data.session) {
      setLoading(false)
      showToast(
        'Account created! Please check your email to confirm your account before logging in.',
        'success'
      )
      return true
    }

    // Update the profile with fullName and phone (trigger creates a blank profile row)
    try {
      await api.patch('/api/profile', { full_name: fullName, phone }, true)
    } catch {
      // Non-fatal — user can update profile later
    }

    const profile = await fetchProfile(data.session.access_token)
    // If the profile doesn't have fullName yet (race condition), use the input value
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
    showToast(`Account created! Welcome, ${fullName}!`, 'success')
    return true
  }

  const logout = async () => {
    setLoading(true)
    await supabase.auth.signOut()
    setUser(null)
    setToken(null)
    setLoading(false)
    showToast('Logged out successfully', 'success')
  }

  const updateProfile = async (fullName: string, phone: string): Promise<boolean> => {
    setLoading(true)
    const res = await api.patch<{
      success: boolean
      data?: Record<string, unknown>
      error?: { message: string }
    }>('/api/profile', { full_name: fullName, phone }, true)
    setLoading(false)

    if (res.success && res.data) {
      setUser(mapProfile(res.data))
      showToast('Profile updated successfully', 'success')
      return true
    } else {
      showToast(res.error?.message || 'Profile update failed', 'error')
      return false
    }
  }

  const isAuthenticated = !!user
  const isAdmin = user?.role === 'admin'

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        signup,
        logout,
        updateProfile,
        isAuthenticated,
        isAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within an AuthProvider')
  return context
}
