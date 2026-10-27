import React from 'react'
import { EditorialCampaigns, StoreIntroduction } from '../components/home/EditorialSections'
import { FeaturedProducts } from '../components/home/BestSellers'
import { CategoryGrid } from '../components/home/CategoryGrid'
import { HeroSlider } from '../components/home/HeroSlider'
import { NewArrivals } from '../components/home/NewArrivals'

export const HomePage: React.FC = () => {
  return (
    <main className="editorial-page">
      <HeroSlider />
      <CategoryGrid />
      <FeaturedProducts />
      <EditorialCampaigns />
      <NewArrivals />
      <StoreIntroduction />
    </main>
  )
}

export default HomePage
