import React from 'react'
import { BestSellers } from '../components/home/BestSellers'
import { CategoryGrid } from '../components/home/CategoryGrid'
import { HeroSlider } from '../components/home/HeroSlider'
import { NewArrivals } from '../components/home/NewArrivals'

export const HomePage: React.FC = () => {
  return (
    <main className="editorial-page">
      <HeroSlider />
      <NewArrivals />
      <CategoryGrid />
      <BestSellers />
    </main>
  )
}

export default HomePage
