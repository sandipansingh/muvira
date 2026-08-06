import { useState, useEffect, useCallback } from 'react'
import type { SiteSettings } from '../types/settings'
import { settingsService } from '../services/settings.service'

const CACHE_KEY = 'site_settings_cache'

function readCache(): SiteSettings | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as SiteSettings
  } catch {
    return null
  }
}

function writeCache(data: SiteSettings): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data))
  } catch {
    // Fail silently if localStorage unavailable
  }
}

export interface UseSiteSettingsReturn {
  settings: SiteSettings | null
  loading: boolean
  refresh: () => Promise<void>
}

/**
 * Business logic hook for site configuration with synchronous localStorage caching.
 * Contains zero UI components or JSX rendering logic.
 */
export function useSiteSettings(): UseSiteSettingsReturn {
  const [settings, setSettings] = useState<SiteSettings | null>(readCache)
  const [loading, setLoading] = useState(() => readCache() === null)

  const refresh = useCallback(async () => {
    if (settings === null) setLoading(true)

    try {
      const res = await settingsService.getSettings()
      if (res.success) {
        const fresh = res.data
        setSettings(fresh)
        writeCache(fresh)
      }
    } catch (err) {
      // Failed to load site settings
    } finally {
      setLoading(false)
    }
  }, [settings])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { settings, loading, refresh }
}
