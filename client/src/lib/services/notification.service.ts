import { api } from '../api/client'
import type { ApiResponse } from '../types/common'
import type { NotificationPreferences } from '../../types/notification'

interface NotificationPreferencesEnvelope {
  success: boolean
  data?: { email_enabled: boolean }
  error?: { code: string; message: string }
}

function mapPreferences(data: { email_enabled: boolean }): NotificationPreferences {
  return { emailEnabled: data.email_enabled }
}

export const notificationService = {
  async getPreferences(): Promise<ApiResponse<NotificationPreferences>> {
    const response = await api.get<NotificationPreferencesEnvelope>(
      '/api/notifications/preferences',
      true
    )
    if (!response.success || !response.data) {
      return {
        success: false,
        error: response.error ?? {
          code: 'PREFERENCES_FETCH_FAILED',
          message: 'Notification preferences could not be loaded.',
        },
      }
    }
    return { success: true, data: mapPreferences(response.data) }
  },

  async updatePreferences(emailEnabled: boolean): Promise<ApiResponse<NotificationPreferences>> {
    const response = await api.put<NotificationPreferencesEnvelope>(
      '/api/notifications/preferences',
      { email_enabled: emailEnabled },
      true
    )
    if (!response.success || !response.data) {
      return {
        success: false,
        error: response.error ?? {
          code: 'PREFERENCES_UPDATE_FAILED',
          message: 'Notification preferences could not be updated.',
        },
      }
    }
    return { success: true, data: mapPreferences(response.data) }
  },
}
