import React from 'react'
import { BestSellers } from '../components/home/BestSellers'
import { CategoryGrid } from '../components/home/CategoryGrid'
import { FaqSection } from '../components/home/FaqSection'
import { HeroSlider } from '../components/home/HeroSlider'
import { NewArrivals } from '../components/home/NewArrivals'
import { TestimonialSection } from '../components/home/TestimonialSection'

export const HomePage: React.FC = () => {
  return (
    <main className="editorial-page">
      <HeroSlider />
      <NewArrivals />
      <CategoryGrid />
      <BestSellers />
      <TestimonialSection />
      <FaqSection />
    </main>
  )
}

export default HomePage
