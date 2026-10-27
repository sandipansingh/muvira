import React, { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useSiteSettings } from '../../context/SiteSettingsContext'
import { editorialImage, heroDestination } from '../../lib/utils/editorialImage'
import { categoryService } from '../../lib/services/category.service'

export const HeroSlider: React.FC = () => {
  const { settings, loading, error, refresh } = useSiteSettings()
  const [currentIndex, setCurrentIndex] = useState(0)
  const [failedSource, setFailedSource] = useState<string>()
  const [categorySlugs, setCategorySlugs] = useState<string[]>([])
  useEffect(() => {
    let active = true
    void categoryService
      .getCategories()
      .then((response) => {
        if (active && response.success)
          setCategorySlugs(response.data.map((category) => category.slug))
      })
      .catch(() => {
        /* Shop remains available if categories cannot be loaded. */
      })
    return () => {
      active = false
    }
  }, [])
  const slides = settings.heroSlides
  const slide = slides[currentIndex] || slides[0]
  const imageSource = slide?.imageUrl && failedSource !== slide.imageUrl ? slide.imageUrl : ''
  const move = (direction: number) =>
    setCurrentIndex((current) => (current + direction + slides.length) % slides.length)

  return (
    <section className="hero-section" aria-label="Muvira collections" aria-busy={loading}>
      <div className="devotion-hero">
        <div className="devotion-hero__image" aria-hidden="true">
          <picture key={slide?.imageUrl || 'atmosphere'}>
            {imageSource && (
              <source media="(max-width: 767px)" srcSet={editorialImage(imageSource, 'mobile')} />
            )}
            <img
              src={
                imageSource ? editorialImage(imageSource) : '/images/editorial/stone-alcove.webp'
              }
              alt=""
              width={1536}
              height={1024}
              fetchPriority="high"
              onError={() => setFailedSource(slide?.imageUrl)}
            />
          </picture>
        </div>
        <div className="devotion-hero__copy">
          <span className="eyebrow">A place for devotion</span>
          <AnimatePresence mode="wait">
            <motion.div
              key={slide?.id || 'welcome'}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <h1>{slide?.title || 'For your everyday devotion.'}</h1>
              <p>
                {slide?.subtitle ||
                  'Discover god idols and puja essentials for the moments that matter to you.'}
              </p>
            </motion.div>
          </AnimatePresence>
          <Link
            to={heroDestination(slide?.link, categorySlugs)}
            className="button-primary w-fit gap-6 px-6 py-4"
          >
            Explore the collection <ArrowRight className="h-4 w-4" />
          </Link>
          {error && (
            <div role="status" className="text-sm text-muted">
              Store highlights could not be loaded.{' '}
              <button
                type="button"
                onClick={() => void refresh()}
                className="underline hover:text-primary"
              >
                Try again
              </button>
            </div>
          )}
          {loading && (
            <p role="status" className="text-sm text-muted">
              Loading store highlights…
            </p>
          )}
          {slides.length > 1 && (
            <div className="hero-navigation" aria-label="Collection slides">
              <button
                type="button"
                onClick={() => move(-1)}
                aria-label="Previous slide"
                className="hero-navigation__button"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm tabular-nums" aria-live="polite">
                {String(currentIndex + 1).padStart(2, '0')}{' '}
                <span className="mx-2 text-muted">/</span> {String(slides.length).padStart(2, '0')}
              </span>
              <button
                type="button"
                onClick={() => move(1)}
                aria-label="Next slide"
                className="hero-navigation__button"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
export default HeroSlider
