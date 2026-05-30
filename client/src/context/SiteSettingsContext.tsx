import React, { createContext, useContext, useState, useEffect } from 'react';
import { settingsApiService } from '../lib/api/settings';
import type { SiteSettings } from '../types/settings';

const CACHE_KEY = 'site_settings_cache';

function readCache(): SiteSettings | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SiteSettings;
  } catch {
    return null;
  }
}

function writeCache(data: SiteSettings): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {
    // localStorage may be unavailable (private mode, quota exceeded) — fail silently
  }
}

interface SiteSettingsContextType {
  settings: SiteSettings | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

const SiteSettingsContext = createContext<SiteSettingsContextType | undefined>(undefined);

export const SiteSettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Initialise from localStorage immediately — no dummy data
  const [settings, setSettings] = useState<SiteSettings | null>(readCache);
  // loading = true only when we have NO cached data yet (first-ever load)
  const [loading, setLoading] = useState(() => readCache() === null);

  const refresh = async () => {
    // Only show loading spinner when there is no cached data to show
    if (settings === null) setLoading(true);

    const res = await settingsApiService.getSettings();

    if (res.success) {
      const fresh = res.data;
      // Update state + persist to localStorage whenever we get fresh data
      setSettings(fresh);
      writeCache(fresh);
    }

    setLoading(false);
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <SiteSettingsContext.Provider value={{ settings, loading, refresh }}>
      {children}
    </SiteSettingsContext.Provider>
  );
};

export function useSiteSettings(): SiteSettingsContextType {
  const ctx = useContext(SiteSettingsContext);
  if (!ctx) throw new Error('useSiteSettings must be used inside SiteSettingsProvider');
  return ctx;
}
