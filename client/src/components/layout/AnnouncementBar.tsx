import React from 'react'
import { useSiteSettings } from '../../context/SiteSettingsContext'

export const AnnouncementBar: React.FC = () => {
  const { settings, loading } = useSiteSettings()
  const announcement = settings.announcementBar

  if (loading || !announcement.enabled || !announcement.message) return null

  return (
    <div className="border-b border-ink bg-ink px-4 py-2 text-center text-xs tracking-wide text-paper">
      <div className="mx-auto flex max-w-7xl items-center justify-center gap-2">
        {announcement.badge && <strong className="text-cognac">{announcement.badge}</strong>}
        <span>{announcement.message}</span>
      </div>
    </div>
  )
}
