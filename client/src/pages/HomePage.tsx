import React from 'react'
import { BestSellers } from '../components/home/BestSellers'
import { CategoryGrid } from '../components/home/CategoryGrid'
import { CraftsmanshipStory } from '../components/home/CraftsmanshipStory'
import { HeroSlider } from '../components/home/HeroSlider'
import { PromoGrid } from '../components/home/PromoGrid'
import { TestimonialSection } from '../components/home/TestimonialSection'
import { TrustBadges } from '../components/home/TrustBadges'

export const HomePage: React.FC = () => {
  return (
    <main className="editorial-page">
      <HeroSlider />
      <TrustBadges />
      <CategoryGrid />
      <BestSellers />
      <PromoGrid />
      <CraftsmanshipStory />
      <TestimonialSection />
    </main>
  )
}
