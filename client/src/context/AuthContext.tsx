import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import type { Profile } from '../lib/types/auth'
import { authApiService } from '../lib/services/auth.service'
import { supabase } from '../lib/supabase'
import { useToast } from './ToastContext'

export interface AuthContextType {
  user: Profile | null
  token: string | null
  loading: boolean
  isAuthenticated: boolean
  isAdmin: boolean
  login: (email: string, pass: string) => Promise<boolean>
  signup: (email: string, pass: string, name: string, phone: string) => Promise<boolean>
  loginWithGoogle: () => Promise<void>
  loginWithApple: () => Promise<void>
  logout: () => Promise<void>
  updateProfile: (fullName: string, phone: string) => Promise<boolean>
  updateUser: (profile: Profile) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

function metadataString(session: Session, key: string): string {
  const value = session.user.user_metadata?.[key]
  return typeof value === 'string' ? value : ''
}

function profileFromSession(session: Session): Profile {
  return {
    id: session.user.id,
    email: session.user.email ?? '',
    fullName: metadataString(session, 'full_name'),
    phone: metadataString(session, 'phone'),
    role: 'customer',
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<Profile | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const { showToast } = useToast()

  const restoreSession = useCallback(async (session: Session) => {
    setToken(session.access_token)
    setUser(profileFromSession(session))

    try {
      const profileResponse = await authApiService.getProfile()
      if (profileResponse.success) setUser(profileResponse.data)
    } catch (error) {
      console.error('Profile restoration error', error)
    }
  }, [])

  useEffect(() => {
    let isMounted = true

    const initialize = async () => {
      try {
        const { data } = await supabase.auth.getSession()
        if (data.session && isMounted) await restoreSession(data.session)
      } catch (error) {
        console.error('Auth initialization error', error)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    void initialize()

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setLoading(true)
        void restoreSession(session).finally(() => setLoading(false))
      } else {
        setToken(null)
        setUser(null)
        setLoading(false)
      }
    })

    return () => {
      isMounted = false
      authListener.subscription.unsubscribe()
    }
  }, [restoreSession])

  const login = async (email: string, pass: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: pass,
      })

      if (error || !data.session) {
        showToast(error?.message || 'Invalid credentials', 'error')
        return false
      }

      showToast('Welcome back to Muvira!', 'success')
      return true
    } catch {
      showToast('An unexpected login error occurred', 'error')
      return false
    }
  }

  const signup = async (
    email: string,
    pass: string,
    name: string,
    phone: string
  ): Promise<boolean> => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password: pass,
        options: { data: { full_name: name, phone } },
      })

      if (error) {
        showToast(error.message, 'error')
        return false
      }

      showToast(
        data.session
          ? 'Account created successfully!'
          : 'Please check your email to confirm registration',
        data.session ? 'success' : 'info'
      )
      return true
    } catch {
      showToast('Signup error occurred', 'error')
      return false
    }
  }

  const loginWithGoogle = async (): Promise<void> => {
    try {
      const redirectUrl =
        typeof window !== 'undefined' ? `${window.location.origin}/profile` : undefined
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
        },
      })
      if (error) {
        showToast(error.message || 'Failed to sign in with Google.', 'error')
      }
    } catch {
      showToast('An unexpected error occurred during Google sign-in.', 'error')
    }
  }

  const loginWithApple = async (): Promise<void> => {
    try {
      const redirectUrl =
        typeof window !== 'undefined' ? `${window.location.origin}/profile` : undefined
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: {
          redirectTo: redirectUrl,
        },
      })
      if (error) {
        showToast(error.message || 'Failed to sign in with Apple.', 'error')
      }
    } catch {
      showToast('An unexpected error occurred during Apple sign-in.', 'error')
    }
  }

  const logout = async (): Promise<void> => {
    await supabase.auth.signOut()
    setUser(null)
    setToken(null)
    showToast('Logged out successfully', 'info')
  }

  const updateProfile = async (fullName: string, phone: string): Promise<boolean> => {
    try {
      const response = await authApiService.updateProfile({ fullName, phone })
      if (!response.success) {
        showToast(response.error.message, 'error')
        return false
      }

      setUser(response.data)
      showToast('Profile updated successfully.', 'success')
      return true
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to update profile.', 'error')
      return false
    }
  }

  const updateUser = (profile: Profile) => setUser(profile)

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated: !!user,
        isAdmin: user?.role === 'admin',
        login,
        signup,
        loginWithGoogle,
        loginWithApple,
        logout,
        updateProfile,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
