import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { settingsService } from '../lib/services/settings.service'
import type { SiteSettings } from '../lib/types/settings'

interface SiteSettingsContextValue {
  settings: SiteSettings
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  applySettings: (settings: SiteSettings) => void
}

const DEFAULT_SETTINGS: SiteSettings = {
  contactInfo: { email: '', phone: '', address: '' },
  announcementBar: { enabled: false, badge: '', message: '' },
  heroSlides: [],
  promoBanners: [],
  storeDescription: '',
  shippingMethods: null,
  configuration: { shipping_ready: false, fulfillment_ready: false, errors: [] },
  shippingRules: null,
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
  const requestVersion = useRef(0)

  const applySettings = useCallback((value: SiteSettings) => {
    requestVersion.current += 1
    setSettings(value)
    setError(null)
    setLoading(false)
  }, [])

  const refresh = useCallback(async () => {
    const version = ++requestVersion.current
    setLoading(true)
    setError(null)

    try {
      const response = await settingsService.getSettings()
      if (version !== requestVersion.current) return
      if (!response.success) throw new Error(response.error.message)
      setSettings(response.data)
    } catch (reason) {
      if (version !== requestVersion.current) return
      const message = reason instanceof Error ? reason.message : 'Failed to load site settings.'
      setError(message)
    } finally {
      if (version === requestVersion.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return (
    <SiteSettingsContext.Provider value={{ settings, loading, error, refresh, applySettings }}>
      {children}
    </SiteSettingsContext.Provider>
  )
}

export const useSiteSettings = () => {
  const context = useContext(SiteSettingsContext)
  if (!context) throw new Error('useSiteSettings must be used within SiteSettingsProvider')
  return context
}
