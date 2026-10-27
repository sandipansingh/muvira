import React from 'react'
import { EditorialCampaigns, StoreIntroduction } from '../components/home/EditorialSections'
import { FeaturedProducts } from '../components/home/BestSellers'
import { CategoryGrid } from '../components/home/CategoryGrid'
import { HeroSlider } from '../components/home/HeroSlider'
import { NewArrivals } from '../components/home/NewArrivals'
import { ShoppingStage, DiscoveryPaths } from '../components/home/ShoppingDiscovery'

export const HomePage: React.FC = () => {
  return (
    <main className="editorial-page">
      <ShoppingStage>
        <HeroSlider />
      </ShoppingStage>
      <CategoryGrid />
      <FeaturedProducts />
      <EditorialCampaigns />
      <DiscoveryPaths />
      <NewArrivals />
      <StoreIntroduction />
    </main>
  )
}

export default HomePage
