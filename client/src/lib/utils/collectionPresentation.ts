import type { Category } from '../types/category'

const captions: Record<string, string> = {
  'best-selling': 'Discover the collection',
  'handmade-showpiece': 'Small details, a personal touch',
  'home-decor': 'Make your space your own',
  'clay-showpiece': 'Explore forms in clay',
  'god-idols': 'A place for everyday devotion',
  vaastu: 'Pieces for your surroundings',
  gifting: 'A thoughtful way to give',
  'car-idols': 'Devotion, wherever you go',
  pooja: 'For your daily rituals',
}

export const collectionHref = (category: Category) =>
  `/shop?category=${encodeURIComponent(category.slug)}`
export const collectionCaption = (category: Category) =>
  captions[category.slug] || category.description || 'Explore the collection'
