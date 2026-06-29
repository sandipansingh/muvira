export interface HeroSlide {
  id: string
  title: string
  subtitle: string
  imageUrl: string
  link: string
}

export interface PromoBanner {
  id: string
  title: string
  subtitle: string
  imageUrl: string
  link: string
}

export interface AnnouncementBar {
  enabled: boolean
  badge: string
  message: string
}

export interface ContactInfo {
  email: string
  phone: string
  address: string
}

export interface ShippingRules {
  shippingChargePaisa: number
  freeShippingThresholdPaisa: number
}

export interface SiteSettings {
  contactInfo: ContactInfo
  announcementBar: AnnouncementBar
  heroSlides: HeroSlide[]
  promoBanners: PromoBanner[]
  storeDescription: string
  shippingRules: ShippingRules
}
