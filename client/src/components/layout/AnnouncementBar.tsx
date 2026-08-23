import React from 'react'
import { useSiteSettings } from '../../context/SiteSettingsContext'

export const AnnouncementBar: React.FC = () => {
  const { settings, loading } = useSiteSettings()
  const announcement = settings.announcementBar

  if (loading || !announcement.enabled || !announcement.message) return null

  return (
    <div className="border-b border-[var(--color-line)] bg-[var(--color-surface)] px-4 py-2 text-center text-xs font-medium text-[var(--color-ink)]">
      <div className="mx-auto flex max-w-7xl items-center justify-center gap-2">
        {announcement.badge && (
          <strong className="status-badge min-h-5 px-2">{announcement.badge}</strong>
        )}
        <span>{announcement.message}</span>
      </div>
    </div>
  )
}

export default AnnouncementBar
