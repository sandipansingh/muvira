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
