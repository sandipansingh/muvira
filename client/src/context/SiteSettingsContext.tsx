import React, { createContext, useContext, useState, useEffect } from 'react';
import { settingsApiService } from '../lib/api/settings';
import type { SiteSettings } from '../types/settings';

const defaultSettings: SiteSettings = {
  contactInfo: {
    email: 'support@muvira.com',
    phone: '+91 98765 43210',
    address: '12 Park Street, Flat 4B, Kolkata, West Bengal, 700016',
  },
  announcementBar: {
    enabled: true,
    badge: 'NEW DEALS',
    message: 'Diwali Festival Sale is active! Save 20% off with coupon DIWALI20',
  },
  heroSlides: [
    {
      id: '1',
      title: 'Festival Furniture Bonanza',
      subtitle: 'Up to 30% Off Sheesham Wood Craftsmanship',
      imageUrl: 'https://images.unsplash.com/photo-1540518614846-7eded433c457?w=1200&auto=format&fit=crop&q=80',
      link: '/categories/solid-wood-furniture',
    },
    {
      id: '2',
      title: 'Handloom apparel & Kurtas',
      subtitle: 'Organic block-print cotton kurtas from Jaipur weavers',
      imageUrl: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=1200&auto=format&fit=crop&q=80',
      link: '/categories/kurtas-apparel',
    },
    {
      id: '3',
      title: 'Bespoke cushions & rugs',
      subtitle: 'Jaipur vegetable dye home coordinates to match your sofas',
      imageUrl: 'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?w=1200&auto=format&fit=crop&q=80',
      link: '/categories/home-decor',
    },
  ],
};

interface SiteSettingsContextType {
  settings: SiteSettings;
  loading: boolean;
  refresh: () => Promise<void>;
}

const SiteSettingsContext = createContext<SiteSettingsContextType | undefined>(undefined);

export const SiteSettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<SiteSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    const res = await settingsApiService.getSettings();
    if (res.success) setSettings(res.data);
    setLoading(false);
  };

  useEffect(() => {
    refresh();
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
