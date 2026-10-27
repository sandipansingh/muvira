import React from 'react'
import { ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useSiteSettings } from '../../context/SiteSettingsContext'

export const EditorialCampaigns: React.FC = () => {
  const { settings, error } = useSiteSettings()
  if (error || settings.promoBanners.length === 0) return null
  return (
    <section className="layout-container section-space" aria-label="From the collection">
      <div className="campaign-grid">
        {settings.promoBanners.map((banner) => (
          <Link key={banner.id} to={banner.link || '/shop'} className="campaign-card group">
            {banner.imageUrl && (
              <img src={banner.imageUrl} alt="" width={800} height={600} loading="lazy" />
            )}
            <div className="campaign-card__copy">
              <div>
                <h2 className="text-h2">{banner.title}</h2>
                {banner.subtitle && <p className="mt-2 text-muted">{banner.subtitle}</p>}
              </div>
              <ArrowUpRight className="h-6 w-6 shrink-0" />
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}

export const StoreIntroduction: React.FC = () => {
  const { settings, error } = useSiteSettings()
  if (error || !settings.storeDescription) return null
  return (
    <section className="store-introduction section-space">
      <div className="layout-container grid gap-8 md:grid-cols-[0.8fr_1.2fr] md:gap-20">
        <div>
          <span className="eyebrow">The Muvira story</span>
          <h2 className="mt-4 text-h2">
            A little closer
            <br />
            to what matters.
          </h2>
        </div>
        <div>
          <p className="text-lg leading-relaxed text-ink-soft">{settings.storeDescription}</p>
          <Link
            to="/shop"
            className="mt-6 inline-flex min-h-11 items-center gap-4 border-b border-ink text-sm hover:text-primary"
          >
            Find your piece <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  )
}
