import React from 'react'
import { HeroSlider } from '../components/home/HeroSlider'
import { TrustBadges } from '../components/home/TrustBadges'
import { CategoryGrid } from '../components/home/CategoryGrid'
import { BestSellers } from '../components/home/BestSellers'
import { CraftsmanshipStory } from '../components/home/CraftsmanshipStory'
import { TestimonialSection } from '../components/home/TestimonialSection'
import { NewsletterBanner } from '../components/home/NewsletterBanner'

export const HomePage: React.FC = () => {
  return (
    <main className="bg-white min-h-screen">
      {/* 1. Hero Slider (Textless image slider with floating Shop Now pill button) */}
      <HeroSlider />

      {/* 2. Trust Badges & Stats Bar */}
      <TrustBadges />

      {/* 3. Shop by Category */}
      <CategoryGrid />

      {/* 4. Our Best Sellers Grid */}
      <BestSellers />

      {/* 5. Craftsmanship & Philosophy Feature */}
      <CraftsmanshipStory />

      {/* 6. Customer Testimonials (Dark Aesthetic) */}
      <TestimonialSection />

      {/* 7. Newsletter Subscription Banner */}
      <NewsletterBanner />
    </main>
  )
}
