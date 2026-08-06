import React, { createContext, useContext, useState, useEffect } from 'react'
import type { Profile } from '../lib/types/auth'
import { supabase } from '../lib/supabase'
import { useToast } from './ToastContext'

interface AuthContextType {
  user: Profile | null
  token: string | null
  loading: boolean
  isAuthenticated: boolean
  isAdmin: boolean
  login: (email: string, pass: string) => Promise<boolean>
  signup: (email: string, pass: string, name: string, phone: string) => Promise<boolean>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<Profile | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const { showToast } = useToast()

  useEffect(() => {
    let isMounted = true

    async function initAuth() {
      try {
        const { data } = await supabase.auth.getSession()
        if (data.session && isMounted) {
          setToken(data.session.access_token)
          setUser({
            id: data.session.user.id,
            email: data.session.user.email || '',
            fullName: data.session.user.user_metadata?.full_name || 'Valued Customer',
            phone: data.session.user.user_metadata?.phone || '',
            role: data.session.user.user_metadata?.role || 'customer',
          })
        }
      } catch (err) {
        console.error('Auth initialization error', err)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    initAuth()

    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session) {
        setToken(session.access_token)
        setUser({
          id: session.user.id,
          email: session.user.email || '',
          fullName: session.user.user_metadata?.full_name || 'Valued Customer',
          phone: session.user.user_metadata?.phone || '',
          role: session.user.user_metadata?.role || 'customer',
        })
      } else {
        setToken(null)
        setUser(null)
      }
      setLoading(false)
    })

    return () => {
      isMounted = false
      authListener.subscription.unsubscribe()
    }
  }, [])

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
        options: {
          data: {
            full_name: name,
            phone,
          },
        },
      })

      if (error) {
        showToast(error.message, 'error')
        return false
      }

      if (data.session) {
        showToast('Account created successfully!', 'success')
      } else {
        showToast('Please check your email to confirm registration', 'info')
      }
      return true
    } catch {
      showToast('Signup error occurred', 'error')
      return false
    }
  }

  const logout = async (): Promise<void> => {
    await supabase.auth.signOut()
    setUser(null)
    setToken(null)
    showToast('Logged out successfully', 'info')
  }

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
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return ctx
}
