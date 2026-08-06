import React, { createContext, useContext, useState } from 'react'

interface SiteSettings {
  storeName: string
  taxRatePercent: number
  freeShippingThresholdPaisa: number
  standardShippingFeePaisa: number
}

const DEFAULT_SETTINGS: SiteSettings = {
  storeName: 'Muvira',
  taxRatePercent: 18,
  freeShippingThresholdPaisa: 100000, // ₹1,000
  standardShippingFeePaisa: 15000, // ₹150
}

const SiteSettingsContext = createContext<SiteSettings>(DEFAULT_SETTINGS)

export const SiteSettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings] = useState<SiteSettings>(DEFAULT_SETTINGS)

  return <SiteSettingsContext.Provider value={settings}>{children}</SiteSettingsContext.Provider>
}

export const useSiteSettings = () => useContext(SiteSettingsContext)
