import { useSiteSettings as useSiteSettingsContext } from '../../context/SiteSettingsContext'

export type UseSiteSettingsReturn = ReturnType<typeof useSiteSettingsContext>

export function useSiteSettings(): UseSiteSettingsReturn {
  return useSiteSettingsContext()
}
