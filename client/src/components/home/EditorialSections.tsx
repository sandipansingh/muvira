import React from 'react'
import { StoreImage } from '../common/StoreImage'

import { Link } from 'react-router-dom'
import { CollectionSpotlight } from './ShoppingDiscovery'
import { useStoreCollections } from '../../context/StoreCollectionsContext'
import { CollectionImage } from '../catalog/CollectionImage'
import { useSiteSettings } from '../../context/SiteSettingsContext'

export const EditorialCampaigns: React.FC = () => {
  const { settings, error } = useSiteSettings()
  if (error || settings.promoBanners.length === 0) return <CollectionSpotlight />
  return (
    <section className="layout-container section-space" aria-label="From the collection">
      <div className="campaign-grid">
        {settings.promoBanners.map((banner) => (
          <Link key={banner.id} to={banner.link || '/shop'} className="campaign-card group">
            {banner.imageUrl && (
              <div className="campaign-card__image">
                <StoreImage
                  src={banner.imageUrl}
                  alt=""
                  width={1000}
                  height={1000}
                  loading="lazy"
                  className="browse-image"
                />
              </div>
            )}
            <div className="campaign-card__copy">
              <div>
                <h2 className="text-h2">{banner.title}</h2>
                {banner.subtitle && <p className="mt-2 text-muted">{banner.subtitle}</p>}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}

export const StoreIntroduction: React.FC = () => {
  const { settings, error } = useSiteSettings()
  const { categories } = useStoreCollections()
  const category = categories.find((item) => item.slug === 'handmade-showpiece') || categories[0]
  if (error || !settings.storeDescription) return null
  return (
    <section className="store-introduction section-space">
      <div className="layout-container store-story-layout">
        {category && (
          <div className="store-story-image">
            <CollectionImage category={category} />
          </div>
        )}
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
            className="mt-6 inline-flex min-h-11 items-center border-b border-ink text-sm hover:text-primary"
          >
            Find your piece
          </Link>
        </div>
      </div>
    </section>
  )
}
