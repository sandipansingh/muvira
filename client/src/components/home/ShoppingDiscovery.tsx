import React from 'react'
import { ArrowRight, ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useStoreCollections } from '../../context/StoreCollectionsContext'
import { collectionCaption, collectionHref } from '../../lib/utils/collectionPresentation'
import { CollectionImage } from '../catalog/CollectionImage'

export function ShoppingStage({ children }: { children: React.ReactNode }) {
  const { categories } = useStoreCollections()
  const selected = ['god-idols', 'home-decor']
    .map((slug) => categories.find((category) => category.slug === slug))
    .filter((category) => category !== undefined)
  const tiles = [
    ...selected,
    ...categories.filter((category) => !selected.includes(category)),
  ].slice(0, 2)
  return (
    <div
      className={`shopping-stage layout-container ${tiles.length ? '' : 'shopping-stage--single'}`}
    >
      {children}
      {tiles.length > 0 && (
        <div className="shopping-stage__tiles">
          {tiles.map((category) => (
            <Link key={category.id} to={collectionHref(category)} className="stage-tile group">
              <CollectionImage category={category} priority />
              <div className="stage-tile__copy">
                <div>
                  <span className="eyebrow">{category.name}</span>
                  <h2>{collectionCaption(category)}</h2>
                </div>
                <ArrowUpRight className="h-5 w-5 shrink-0" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

export function DiscoveryPaths() {
  return (
    <section className="discovery-paths section-space" aria-labelledby="discover-your-way">
      <div className="layout-container discovery-paths__layout">
        <div>
          <span className="eyebrow">A little inspiration</span>
          <h2 id="discover-your-way" className="mt-3 text-h2">
            Find a piece that
            <br />
            speaks to you.
          </h2>
          <p className="mt-4 text-ink-soft">
            Begin with a name close to your heart, or a price that feels right.
          </p>
        </div>
        <div className="discovery-paths__groups">
          <div>
            <h3 className="font-sans font-semibold">Search by deity</h3>
            <div className="discovery-links">
              {['Ganesha', 'Krishna', 'Shiva', 'Durga', 'Jagannath', 'Balaji'].map((name) => (
                <Link key={name} to={`/search?q=${encodeURIComponent(name)}`}>
                  {name}
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              ))}
            </div>
          </div>
          <div>
            <h3 className="font-sans font-semibold">Explore by budget</h3>
            <div className="discovery-links discovery-links--budget">
              {[
                ['Under ₹500', '/shop?maxPrice=500'],
                ['₹500 – ₹1,000', '/shop?minPrice=500&maxPrice=1000'],
                ['₹1,000 & above', '/shop?minPrice=1000'],
              ].map(([label, href]) => (
                <Link key={href} to={href}>
                  {label}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export function CollectionSpotlight() {
  const { categories } = useStoreCollections()
  const category = categories.find((item) => item.slug === 'handmade-showpiece') || categories[0]
  if (!category) return null
  return (
    <section className="layout-container section-space" aria-label="Collection spotlight">
      <Link to={collectionHref(category)} className="collection-spotlight group">
        <div className="collection-spotlight__image">
          <CollectionImage category={category} />
        </div>
        <div className="collection-spotlight__copy">
          <span className="eyebrow">In the spotlight · {category.name}</span>
          <h2>{collectionCaption(category)}</h2>
          <p>
            {category.description &&
            category.description.trim().toLowerCase() !== category.name.trim().toLowerCase()
              ? category.description
              : `Take a closer look at our ${category.name.toLowerCase().trim()} collection and find a place for something meaningful.`}
          </p>
          <span className="collection-link">
            Explore {category.name.trim()} <ArrowRight className="h-4 w-4" />
          </span>
        </div>
      </Link>
    </section>
  )
}
