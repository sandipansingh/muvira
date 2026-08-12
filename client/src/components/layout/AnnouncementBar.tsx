import React from 'react'
import { useSiteSettings } from '../../context/SiteSettingsContext'

export const AnnouncementBar: React.FC = () => {
  const { settings, loading } = useSiteSettings()
  const announcement = settings.announcementBar

  if (loading || !announcement.enabled || !announcement.message) return null

  return (
    <div className="bg-neutral-950 px-4 py-2 text-center text-xs font-medium text-neutral-200">
      <div className="mx-auto flex max-w-7xl items-center justify-center gap-2">
        {announcement.badge && (
          <strong className="rounded-full bg-neutral-800 px-2 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">
            {announcement.badge}
          </strong>
        )}
        <span>{announcement.message}</span>
      </div>
    </div>
  )
}

export default AnnouncementBar
