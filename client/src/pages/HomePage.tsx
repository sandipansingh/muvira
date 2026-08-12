import React from 'react'
import { BestSellers } from '../components/home/BestSellers'
import { CategoryGrid } from '../components/home/CategoryGrid'
import { HeroSlider } from '../components/home/HeroSlider'
import { TestimonialSection } from '../components/home/TestimonialSection'
import { WhyChooseUs } from '../components/home/WhyChooseUs'

export const HomePage: React.FC = () => {
  return (
    <main className="editorial-page">
      <HeroSlider />
      <CategoryGrid />
      <BestSellers />
      <WhyChooseUs />
      <TestimonialSection />
    </main>
  )
}
