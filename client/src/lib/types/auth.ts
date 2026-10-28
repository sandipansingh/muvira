/**
 * User Profile and Authentication types.
 */
export interface Profile {
  id: string
  fullName: string
  phone: string
  role: 'user' | 'customer' | 'admin'
  createdAt?: string
  email?: string
}

export interface AuthState {
  user: Profile | null
  token: string | null
  isAuthenticated: boolean
  isAdmin: boolean
}

export type AuthMode = 'signin' | 'signup'

export interface AuthDialogOptions {
  mode: AuthMode
  returnTo?: string
  trigger?: HTMLElement | null
  fallbackFocus?: 'account' | 'bag' | 'menu'
}

export interface AuthNavigationState {
  authDialog: { mode: AuthMode; returnTo?: string }
}
