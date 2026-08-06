import { api } from '../api/client'
import { mapProfile } from '../utils/adapters'
import type { Profile } from '../types/auth'
import type { ApiResponse } from '../types/common'

/**
 * User profile and authentication API service functions.
 */
export const authApiService = {
  /**
   * Fetches the current user's profile from the backend API.
   */
  async getProfile(): Promise<ApiResponse<Profile>> {
    const res = await api.get<{
      success: boolean
      data?: Record<string, unknown>
      error?: { code: string; message: string }
    }>('/api/profile', true)

    if (!res.success || !res.data) {
      return {
        success: false,
        error: res.error ?? { code: 'PROFILE_FETCH_FAILED', message: 'Failed to fetch profile' },
      }
    }

    return { success: true, data: mapProfile(res.data) }
  },

  /**
   * Updates the current user's profile information.
   */
  async updateProfile(profileData: {
    fullName?: string
    phone?: string
  }): Promise<ApiResponse<Profile>> {
    const body: Record<string, unknown> = {}
    if (profileData.fullName !== undefined) body['full_name'] = profileData.fullName
    if (profileData.phone !== undefined) body['phone'] = profileData.phone

    const res = await api.patch<{
      success: boolean
      data?: Record<string, unknown>
      error?: { code: string; message: string }
    }>('/api/profile', body, true)

    if (!res.success || !res.data) {
      return {
        success: false,
        error: res.error ?? { code: 'PROFILE_UPDATE_FAILED', message: 'Failed to update profile' },
      }
    }

    return { success: true, data: mapProfile(res.data) }
  },
}
