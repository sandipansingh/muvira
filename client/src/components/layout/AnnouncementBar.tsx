import React from 'react'
import { useSiteSettings } from '../../context/SiteSettingsContext'

export const AnnouncementBar: React.FC = () => {
  const { settings, loading } = useSiteSettings()
  const announcement = settings.announcementBar

  if (loading || !announcement.enabled || !announcement.message) return null

  return (
    <div className="bg-slate-900 px-4 py-2 text-center text-xs font-medium text-slate-200 shadow-xs">
      <div className="mx-auto flex max-w-7xl items-center justify-center gap-2">
        {announcement.badge && (
          <strong className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">
            {announcement.badge}
          </strong>
        )}
        <span>{announcement.message}</span>
      </div>
    </div>
  )
}
