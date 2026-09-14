import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { settingsService } from '../lib/services/settings.service'
import type { SiteSettings } from '../lib/types/settings'

interface SiteSettingsContextValue {
  settings: SiteSettings
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
}

const DEFAULT_SETTINGS: SiteSettings = {
  contactInfo: { email: '', phone: '', address: '' },
  announcementBar: { enabled: false, badge: '', message: '' },
  heroSlides: [],
  promoBanners: [],
  storeDescription: '',
  shippingRules: {
    shippingChargePaisa: 15000,
    freeShippingThresholdPaisa: 100000,
  },
  shiprocketSettings: {
    pickupLocation: '',
    defaultLengthCm: 15,
    defaultBreadthCm: 10,
    defaultHeightCm: 5,
    defaultWeightGrams: 500,
  },
}

const SiteSettingsContext = createContext<SiteSettingsContextValue | undefined>(undefined)

export const SiteSettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await settingsService.getSettings()
      if (!response.success) throw new Error(response.error.message)
      setSettings(response.data)
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : 'Failed to load site settings.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return (
    <SiteSettingsContext.Provider value={{ settings, loading, error, refresh }}>
      {children}
    </SiteSettingsContext.Provider>
  )
}

export const useSiteSettings = () => {
  const context = useContext(SiteSettingsContext)
  if (!context) throw new Error('useSiteSettings must be used within SiteSettingsProvider')
  return context
}
