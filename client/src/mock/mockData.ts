import type { ProductDetail, ProductListItem } from '../lib/types/product'
import type { Category } from '../lib/types/category'
import type { Review } from '../lib/types/review'

export interface HeroSlide {
  id: string
  imageUrl: string
  alt: string
  link: string
}

export const MOCK_HERO_SLIDES: HeroSlide[] = [
  {
    id: 'slide-1',
    imageUrl:
      'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=2000&q=85',
    alt: 'Modern Living Room Furniture Collection',
    link: '/shop?category=living-room',
  },
  {
    id: 'slide-2',
    imageUrl:
      'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=2000&q=85',
    alt: 'Minimalist Dining & Solid Wood Tables',
    link: '/shop?category=dining',
  },
  {
    id: 'slide-3',
    imageUrl:
      'https://images.unsplash.com/photo-1540518614846-7eded433c457?auto=format&fit=crop&w=2000&q=85',
    alt: 'Serene Bedroom & Upholstered Beds',
    link: '/shop?category=bedroom',
  },
]

export const MOCK_CATEGORIES: Category[] = [
  {
    id: 'cat-1',
    name: 'Living Room',
    slug: 'living-room',
    description: 'Minimalist sofas, accent armchairs, solid oak coffee tables, and lounger units.',
    imageUrl:
      'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=800&q=80',
    sortOrder: 1,
    itemCount: 84,
    showInNavbar: true,
  },
  {
    id: 'cat-2',
    name: 'Bedroom',
    slug: 'bedroom',
    description:
      'Solid wood bed frames, nightstands, modular wardrobes, and organic linen bedding.',
    imageUrl:
      'https://images.unsplash.com/photo-1616594039964-ae9021a400a0?auto=format&fit=crop&w=800&q=80',
    sortOrder: 2,
    itemCount: 52,
    showInNavbar: true,
  },
  {
    id: 'cat-3',
    name: 'Dining',
    slug: 'dining',
    description: 'Handcrafted dining tables, ergonomic wooden chairs, and sideboard storage.',
    imageUrl:
      'https://images.unsplash.com/photo-1617806118233-18e1de247200?auto=format&fit=crop&w=800&q=80',
    sortOrder: 3,
    itemCount: 41,
    showInNavbar: true,
  },
  {
    id: 'cat-4',
    name: 'Office & Decor',
    slug: 'office-decor',
    description: 'Ergonomic study desks, stoneware vases, brass floor lamps, and woven wool rugs.',
    imageUrl:
      'https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?auto=format&fit=crop&w=800&q=80',
    sortOrder: 4,
    itemCount: 38,
    showInNavbar: true,
  },
]

export const MOCK_PRODUCTS: ProductDetail[] = [
  {
    id: 'prod-1',
    name: 'Hollis 3-Seater Sofa',
    slug: 'hollis-3-seater-sofa',
    description:
      'The Hollis sofa is built around a kiln-dried solid oak frame, supporting high-resilience foam cushions for a seat that holds its shape for years. Wrapped in textured bouclé fabric.',
    shortDescription: 'Kiln-dried solid oak 3-seater sofa wrapped in textured bouclé fabric.',
    price: 214000,
    salePrice: 249000,
    discountPercent: 14,
    stock: 14,
    inStock: true,
    sku: 'SOF-HOL-01',
    isFeatured: true,
    isActive: true,
    category: {
      id: 'cat-1',
      name: 'Sofas',
      slug: 'living-room',
    },
    images: [
      {
        id: 'img-1-1',
        url: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=1200&q=85',
        altText: 'Hollis Sofa Main View',
        isPrimary: true,
        sortOrder: 1,
      },
      {
        id: 'img-1-2',
        url: 'https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?auto=format&fit=crop&w=1200&q=85',
        altText: 'Hollis Sofa Side Profile',
        isPrimary: false,
        sortOrder: 2,
      },
      {
        id: 'img-1-3',
        url: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=1200&q=85',
        altText: 'Hollis Sofa Texture Detail',
        isPrimary: false,
        sortOrder: 3,
      },
    ],
    metadata: {
      Frame: 'Solid Oak, FSC-certified',
      Cushions: 'High-resilience foam & feather blend',
      Cover: '100% Wool Bouclé, removable',
      Assembly: 'Legs attach in minutes',
      Dimensions: 'W 220cm × D 95cm × H 78cm',
    },
    createdAt: '2026-07-01T00:00:00Z',
    rating: 4.8,
    reviewCount: 38,
  },
  {
    id: 'prod-2',
    name: 'Marlow Lounge Chair',
    slug: 'marlow-lounge-chair',
    description:
      'Sculptural accent armchair crafted with a contoured solid walnut frame, deep ergonomic seat cushion, and premium velvet upholstery.',
    shortDescription: 'Sculptural solid walnut armchair with terracotta velvet upholstery.',
    price: 89000,
    salePrice: 105000,
    discountPercent: 15,
    stock: 4,
    inStock: true,
    sku: 'CHR-MAR-02',
    isFeatured: true,
    isActive: true,
    category: {
      id: 'cat-1',
      name: 'Chairs',
      slug: 'living-room',
    },
    images: [
      {
        id: 'img-2-1',
        url: 'https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?auto=format&fit=crop&w=1200&q=85',
        altText: 'Marlow Lounge Chair Main',
        isPrimary: true,
        sortOrder: 1,
      },
      {
        id: 'img-2-2',
        url: 'https://images.unsplash.com/photo-1580481072645-022f9a6d83d0?auto=format&fit=crop&w=1200&q=85',
        altText: 'Marlow Chair Angle',
        isPrimary: false,
        sortOrder: 2,
      },
    ],
    metadata: {
      Wood: 'Solid American Walnut',
      Upholstery: 'Terracotta Velvet',
      Dimensions: 'W 78cm × D 82cm × H 75cm',
    },
    createdAt: '2026-07-05T00:00:00Z',
    rating: 4.9,
    reviewCount: 27,
  },
  {
    id: 'prod-3',
    name: 'Bessen Oak Coffee Table',
    slug: 'bessen-oak-coffee-table',
    description:
      'Minimalist low profile coffee table featuring rounded pill-shaped oak legs and smooth bevelled solid oak tabletop with subtle grain patterns.',
    shortDescription: 'Solid white oak low profile coffee table with rounded pill legs.',
    price: 64000,
    salePrice: null,
    discountPercent: 0,
    stock: 18,
    inStock: true,
    sku: 'TBL-[#3]',
    isFeatured: true,
    isActive: true,
    category: {
      id: 'cat-1',
      name: 'Tables',
      slug: 'living-room',
    },
    images: [
      {
        id: 'img-3-1',
        url: 'https://images.unsplash.com/photo-1533090161767-e6ffed986c88?auto=format&fit=crop&w=1200&q=85',
        altText: 'Bessen Oak Coffee Table Top',
        isPrimary: true,
        sortOrder: 1,
      },
    ],
    metadata: {
      Material: '100% Solid White Oak',
      Finish: 'Matte Natural Oil',
      Dimensions: 'L 130cm × W 70cm × H 38cm',
    },
    createdAt: '2026-07-10T00:00:00Z',
    rating: 4.7,
    reviewCount: 19,
  },
  {
    id: 'prod-4',
    name: 'Alder Ceramic Table Lamp',
    slug: 'alder-ceramic-table-lamp',
    description:
      'Hand-turned ribbed ceramic lamp base paired with a warm woven linen drum shade. Radiates soft ambient glow.',
    shortDescription: 'Hand-turned ribbed ceramic lamp base with woven linen shade.',
    price: 21000,
    salePrice: 25000,
    discountPercent: 16,
    stock: 22,
    inStock: true,
    sku: 'LMP-ALD-04',
    isFeatured: false,
    isActive: true,
    category: {
      id: 'cat-4',
      name: 'Lighting',
      slug: 'office-decor',
    },
    images: [
      {
        id: 'img-4-1',
        url: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=1200&q=85',
        altText: 'Alder Ceramic Table Lamp',
        isPrimary: true,
        sortOrder: 1,
      },
    ],
    metadata: {
      Base: 'Terracotta Ceramic',
      Bulb: 'E27 Warm LED (Included)',
      Dimensions: 'H 48cm × Diameter 32cm',
    },
    createdAt: '2026-07-12T00:00:00Z',
    rating: 4.9,
    reviewCount: 15,
  },
  {
    id: 'prod-5',
    name: 'Norra Modular Bookshelf',
    slug: 'norra-modular-bookshelf',
    description:
      'Architectural open-shelf modular bookcase made with solid sheesham wood and brass structural joinery.',
    shortDescription: 'Architectural open-shelf modular bookcase in solid sheesham.',
    price: 132000,
    salePrice: null,
    discountPercent: 0,
    stock: 8,
    inStock: true,
    sku: 'STG-NOR-05',
    isFeatured: true,
    isActive: true,
    category: {
      id: 'cat-4',
      name: 'Storage',
      slug: 'office-decor',
    },
    images: [
      {
        id: 'img-5-1',
        url: 'https://images.unsplash.com/photo-1594631252845-29fc4cc86db9?auto=format&fit=crop&w=1200&q=85',
        altText: 'Norra Modular Bookshelf',
        isPrimary: true,
        sortOrder: 1,
      },
    ],
    metadata: {
      Wood: 'Sheesham Solid Hardwood',
      Shelves: '5 Tier',
      Dimensions: 'W 90cm × D 35cm × H 180cm',
    },
    createdAt: '2026-07-15T00:00:00Z',
    rating: 4.8,
    reviewCount: 22,
  },
  {
    id: 'prod-6',
    name: 'Wren Upholstered Bed Frame',
    slug: 'wren-upholstered-bed-frame',
    description:
      'Plush padded headboard bed frame with tapered solid oak legs and reinforced wooden slat base.',
    shortDescription: 'Plush oatmeal linen upholstered bed frame with solid oak legs.',
    price: 186000,
    salePrice: 209000,
    discountPercent: 11,
    stock: 6,
    inStock: true,
    sku: 'BED-WRN-06',
    isFeatured: true,
    isActive: true,
    category: {
      id: 'cat-2',
      name: 'Beds',
      slug: 'bedroom',
    },
    images: [
      {
        id: 'img-6-1',
        url: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=85',
        altText: 'Wren Bed Frame',
        isPrimary: true,
        sortOrder: 1,
      },
    ],
    metadata: {
      Size: 'King (180cm × 200cm)',
      Fabric: 'Neutral Oatmeal Linen',
      Dimensions: 'W 192cm × L 215cm × H 110cm',
    },
    createdAt: '2026-07-18T00:00:00Z',
    rating: 4.8,
    reviewCount: 31,
  },
  {
    id: 'prod-7',
    name: 'Linden Stoneware Vase',
    slug: 'linden-stoneware-vase',
    description:
      'Artisanal matte cream stoneware ceramic vase with organic asymmetrical silhouette and textured touch.',
    shortDescription: 'Artisanal matte cream stoneware ceramic vase.',
    price: 7800,
    salePrice: null,
    discountPercent: 0,
    stock: 30,
    inStock: true,
    sku: 'DEC-LIN-07',
    isFeatured: false,
    isActive: true,
    category: {
      id: 'cat-4',
      name: 'Decor',
      slug: 'office-decor',
    },
    images: [
      {
        id: 'img-7-1',
        url: 'https://images.unsplash.com/photo-1612196808214-b7e239e5f6b7?auto=format&fit=crop&w=1200&q=85',
        altText: 'Linden Stoneware Vase',
        isPrimary: true,
        sortOrder: 1,
      },
    ],
    metadata: {
      Material: 'Stoneware Ceramic',
      Dimensions: 'H 28cm × Diameter 16cm',
    },
    createdAt: '2026-07-20T00:00:00Z',
    rating: 4.7,
    reviewCount: 42,
  },
  {
    id: 'prod-8',
    name: 'Calder Wool Area Rug',
    slug: 'calder-wool-area-rug',
    description:
      'Hand-tufted 100% New Zealand wool rug featuring textured subtle high-low geometric carving.',
    shortDescription: 'Hand-tufted 100% New Zealand wool area rug.',
    price: 54000,
    salePrice: null,
    discountPercent: 0,
    stock: 12,
    inStock: true,
    sku: 'RUG-CAL-08',
    isFeatured: false,
    isActive: true,
    category: {
      id: 'cat-4',
      name: 'Decor',
      slug: 'office-decor',
    },
    images: [
      {
        id: 'img-8-1',
        url: 'https://images.unsplash.com/photo-1600121848594-d8644e57abab?auto=format&fit=crop&w=1200&q=85',
        altText: 'Calder Wool Area Rug',
        isPrimary: true,
        sortOrder: 1,
      },
    ],
    metadata: {
      Material: '100% Wool',
      Dimensions: '200cm × 300cm',
    },
    createdAt: '2026-07-22T00:00:00Z',
    rating: 4.9,
    reviewCount: 18,
  },
]

export const MOCK_PRODUCT_LIST_ITEMS: ProductListItem[] = MOCK_PRODUCTS.map((p) => ({
  id: p.id,
  name: p.name,
  slug: p.slug,
  shortDescription: p.shortDescription,
  price: p.price,
  salePrice: p.salePrice,
  discountPercent: p.discountPercent,
  stock: p.stock,
  inStock: p.inStock,
  isFeatured: p.isFeatured,
  categoryId: p.category.id,
  categoryName: p.category.name,
  primaryImageUrl: p.images[0]?.url || '',
  createdAt: p.createdAt,
  rating: p.rating,
  reviewCount: p.reviewCount,
}))

export const MOCK_REVIEWS: Review[] = [
  {
    id: 'rev-1',
    productId: 'prod-1',
    userName: 'Maya R.',
    userAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
    rating: 5,
    comment:
      'Worth every single rupee! The bouclé cover is so soft yet durable. Delivery was fast and painless.',
    createdAt: '2026-07-28T10:30:00Z',
    verifiedPurchase: true,
  },
  {
    id: 'rev-2',
    productId: 'prod-1',
    userName: 'Vikram S.',
    userAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop',
    rating: 5,
    comment:
      'Our living room finally feels finished! The oak frame is rock solid and fits our apartment layout seamlessly.',
    createdAt: '2026-07-15T14:20:00Z',
    verifiedPurchase: true,
  },
  {
    id: 'rev-3',
    productId: 'prod-2',
    userName: 'Priya N.',
    userAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop',
    rating: 5,
    comment:
      'The terracotta velvet is so rich and comfortable. Extremely well crafted, legs were easy to attach.',
    createdAt: '2026-08-01T09:12:00Z',
    verifiedPurchase: true,
  },
]

export const MOCK_TESTIMONIALS = [
  {
    id: 't-1',
    quote:
      'Muvira transformed our new home. The oak coffee table and Hollis sofa are real conversation pieces whenever friends visit.',
    author: 'Samarth & Neha',
    location: 'Mumbai, MH',
    rating: 5,
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&h=120&fit=crop',
  },
  {
    id: 't-2',
    quote:
      'The white-glove delivery team set up our bed frame in 15 minutes flat. Top tier quality timber and finish!',
    author: 'Rohan Mehra',
    location: 'Bengaluru, KA',
    rating: 5,
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&h=120&fit=crop',
  },
  {
    id: 't-3',
    quote:
      'Incredible craftsmanship and attention to detail. Finding sustainable solid wood furniture of this calibre is rare.',
    author: 'Ananya Rathore',
    location: 'New Delhi, DL',
    rating: 5,
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&h=120&fit=crop',
  },
]
