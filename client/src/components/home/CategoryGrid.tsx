import React from 'react'
import { ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useStoreCollections } from '../../context/StoreCollectionsContext'
import { collectionCaption, collectionHref } from '../../lib/utils/collectionPresentation'
import { CollectionImage } from '../catalog/CollectionImage'

export const CategoryGrid: React.FC = () => {
  const { categories, loading, error } = useStoreCollections()
  return (
    <section id="shop-collection" className="editorial-container section-space">
      <div className="collection-heading">
        <div>
          <span className="eyebrow">Many ways to make it yours</span>
          <h2 className="mt-3 text-h2">Explore the collections</h2>
        </div>
        <Link to="/categories" className="collection-link">
          View all categories <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>
      {loading && (
        <p role="status" className="py-12">
          Loading collections…
        </p>
      )}
      {!loading && error && (
        <p role="status" className="panel p-6">
          {error}{' '}
          <Link to="/shop" className="underline">
            Browse all products
          </Link>
        </p>
      )}
      {!loading && !error && categories.length === 0 && (
        <p className="py-8 text-muted">
          No categories are available.{' '}
          <Link to="/shop" className="underline">
            Browse the shop
          </Link>
        </p>
      )}
      <div className="category-mosaic">
        {categories.map((category) => (
          <Link key={category.id} to={collectionHref(category)} className="mosaic-tile group">
            <div className="mosaic-tile__image">
              <CollectionImage category={category} className="browse-image" />
            </div>
            <div className="mosaic-tile__copy">
              <div>
                <h3>{category.name}</h3>
                <p>{collectionCaption(category)}</p>
              </div>
              <ArrowUpRight className="h-5 w-5 shrink-0" />
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
export default CategoryGrid
