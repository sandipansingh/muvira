import React from 'react'
import { Link } from 'react-router-dom'

import { useStoreCollections } from '../context/StoreCollectionsContext'
import { collectionCaption, collectionHref } from '../lib/utils/collectionPresentation'
import { CollectionImage } from '../components/catalog/CollectionImage'
import { Breadcrumbs } from '../components/common/Breadcrumbs'

export const CategoriesPage: React.FC = () => {
  const { categories, loading, error } = useStoreCollections()
  const lead = categories.find((category) => category.slug === 'god-idols') || categories[0]
  const remaining = categories.filter((category) => category.id !== lead?.id)
  return (
    <main className="collection-directory editorial-page pb-16">
      <div className="layout-container">
        <Breadcrumbs
          items={[{ label: 'Home', href: '/' }, { label: 'Collections' }]}
          className="py-6"
        />
        <div className="directory-intro">
          <div>
            <span className="eyebrow">The Muvira collection directory</span>
            <h1>
              Something meaningful.
              <br />
              Somewhere to begin.
            </h1>
          </div>
          <p>
            From your daily ritual to a thoughtful gift, explore the details that make a space feel
            like yours.
          </p>
        </div>
        {loading && (
          <p role="status" className="py-16">
            Loading collections…
          </p>
        )}
        {!loading && error && (
          <p role="status" className="panel p-6">
            Collections could not be loaded: {error}{' '}
            <Link to="/shop" className="underline">
              Browse the shop
            </Link>
          </p>
        )}
        {!loading && !error && !lead && (
          <div className="panel p-8">
            <h2 className="text-h2">No categories available</h2>
            <Link to="/shop" className="collection-link mt-4">
              Browse all products
            </Link>
          </div>
        )}
        {lead && (
          <>
            <nav className="collection-jumps" aria-label="Jump to a collection">
              {categories.map((category) => (
                <a key={category.id} href={`#collection-${category.id}`}>
                  {category.name}
                </a>
              ))}
            </nav>
            <section id={`collection-${lead.id}`} className="directory-lead">
              <Link to={collectionHref(lead)} className="directory-lead__image group">
                <CollectionImage category={lead} priority className="browse-image" />
              </Link>
              <div>
                <span className="eyebrow">Begin here</span>
                <h2>{lead.name}</h2>
                <p>{collectionCaption(lead)}</p>
                <p className="mt-4 text-ink-soft">{lead.description}</p>
                <Link to={collectionHref(lead)} className="button-primary mt-6">
                  Explore {lead.name}
                </Link>
              </div>
            </section>
            <div className="directory-grid">
              {remaining.map((category) => (
                <section
                  id={`collection-${category.id}`}
                  key={category.id}
                  className="directory-collection"
                >
                  <Link to={collectionHref(category)} className="group">
                    <div className="directory-collection__image">
                      <CollectionImage category={category} className="browse-image" />
                    </div>
                    <div className="directory-collection__copy">
                      <div>
                        <h2>{category.name}</h2>
                        <p>{collectionCaption(category)}</p>
                      </div>
                    </div>
                  </Link>
                </section>
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  )
}
export default CategoriesPage
