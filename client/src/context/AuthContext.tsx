import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import type { Profile } from '../lib/types/auth'
import { authApiService } from '../lib/services/auth.service'
import { supabase } from '../lib/supabase'
import { authRedirectUrl, PASSWORD_RECOVERY_SESSION_KEY } from '../lib/authRedirect'
import { useToast } from './ToastContext'

export interface AuthContextType {
  user: Profile | null
  token: string | null
  loading: boolean
  isAuthenticated: boolean
  isAdmin: boolean
  profileError: string | null
  retryProfile: () => Promise<boolean>
  login: (email: string, pass: string) => Promise<boolean>
  signup: (
    email: string,
    pass: string,
    name: string,
    phone: string
  ) => Promise<'authenticated' | 'confirmation' | false>
  loginWithGoogle: () => Promise<void>
  logout: () => Promise<void>
  updateProfile: (fullName: string, phone: string) => Promise<boolean>
  updateUser: (profile: Profile) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<Profile | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [profileError, setProfileError] = useState<string | null>(null)
  const { showToast } = useToast()

  const restoreSession = useCallback(async (session: Session): Promise<boolean> => {
    setUser(null)
    setToken(null)
    setProfileError(null)
    try {
      const profileResponse = await authApiService.getProfile()
      if (!profileResponse.success) throw new Error(profileResponse.error.message)
      setToken(session.access_token)
      setUser(profileResponse.data)
      return true
    } catch (error) {
      setProfileError(
        error instanceof Error ? error.message : 'Your account profile could not be loaded.'
      )
      return false
    }
  }, [])

  const retryProfile = useCallback(async (): Promise<boolean> => {
    setLoading(true)
    try {
      const { data } = await supabase.auth.getSession()
      if (!data.session) {
        setProfileError('Your session has expired. Please sign in again.')
        return false
      }
      return await restoreSession(data.session)
    } finally {
      setLoading(false)
    }
  }, [restoreSession])

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

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' && session) {
        sessionStorage.setItem(PASSWORD_RECOVERY_SESSION_KEY, session.access_token)
      } else if (!session || event === 'SIGNED_OUT') {
        sessionStorage.removeItem(PASSWORD_RECOVERY_SESSION_KEY)
      }
      if (session) {
        setLoading(true)
        void restoreSession(session).finally(() => setLoading(false))
      } else {
        setToken(null)
        setUser(null)
        setProfileError(null)
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
  ): Promise<'authenticated' | 'confirmation' | false> => {
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
      return data.session ? 'authenticated' : 'confirmation'
    } catch {
      showToast('Signup error occurred', 'error')
      return false
    }
  }

  const loginWithGoogle = async (): Promise<void> => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: authRedirectUrl('/profile'),
        },
      })
      if (error) {
        showToast(error.message || 'Failed to sign in with Google.', 'error')
      }
    } catch {
      showToast('An unexpected error occurred during Google sign-in.', 'error')
    }
  }

  const logout = async (): Promise<void> => {
    await supabase.auth.signOut()
    setUser(null)
    setToken(null)
    setProfileError(null)
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
        profileError,
        retryProfile,
        login,
        signup,
        loginWithGoogle,
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
