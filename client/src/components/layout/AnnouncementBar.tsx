import React from 'react'
import { useSiteSettings } from '../../context/SiteSettingsContext'

export const AnnouncementBar: React.FC = () => {
  const { settings, loading } = useSiteSettings()
  const announcement = settings.announcementBar

  if (loading || !announcement.enabled || !announcement.message) return null

  return (
    <div className="border-b border-[var(--kit-line)] bg-[var(--kit-surface)] px-4 py-2 text-center text-xs font-medium text-[var(--kit-ink)]">
      <div className="mx-auto flex max-w-7xl items-center justify-center gap-2">
        {announcement.badge && (
          <strong className="kit-status-badge min-h-5 px-2 text-[10px]">
            {announcement.badge}
          </strong>
        )}
        <span>{announcement.message}</span>
      </div>
    </div>
  )
}

export default AnnouncementBar
