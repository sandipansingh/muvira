import type { ProductDetail } from '../types/product';
import type { Category } from '../types/category';
import type { Coupon } from '../types/coupon';
import type { Campaign } from '../types/campaign';
import type { OrderDetail } from '../types/order';
import type { Address, Cart } from '../types/cart';
import type { Profile } from '../types/auth';

// Seed Categories
const initialCategories: Category[] = [
  {
    id: 'cat-kurtas',
    name: 'Kurtas & Apparel',
    slug: 'kurtas-apparel',
    description: 'Beautiful handloom cotton and silk kurtas, sarees, and ethnic wear.',
    imageUrl: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=600&auto=format&fit=crop&q=80',
    sortOrder: 0,
    isActive: true,
  },
  {
    id: 'cat-home-decor',
    name: 'Home Decor',
    slug: 'home-decor',
    description: 'Vases, candle holders, blockprinted cushions, and decorative pieces.',
    imageUrl: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=600&auto=format&fit=crop&q=80',
    sortOrder: 1,
    isActive: true,
  },
  {
    id: 'cat-furniture',
    name: 'Solid Wood Furniture',
    slug: 'solid-wood-furniture',
    description: 'Handcrafted Sheesham and teak wood sofas, beds, coffee tables, and cabinets.',
    imageUrl: 'https://images.unsplash.com/photo-1540518614846-7eded433c457?w=600&auto=format&fit=crop&q=80',
    sortOrder: 2,
    isActive: true,
  },
  {
    id: 'cat-bed-bath',
    name: 'Bed & Bath',
    slug: 'bed-bath',
    description: 'Premium organic cotton bedspreads, blankets, and towels.',
    imageUrl: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=600&auto=format&fit=crop&q=80',
    sortOrder: 3,
    isActive: true,
  },
];

// Seed Products
const initialProducts: ProductDetail[] = [
  {
    id: 'prod-kurta-1',
    name: 'Cotton Handloom Kurta',
    slug: 'cotton-handloom-kurta',
    description: 'Soft handloom cotton kurta featuring a rich indigo block-print layout. Highly breathable and perfect for hot summers. Tailored with a smart mandarin collar and wooden buttons. Ethical, sustainable, and handmade by local weavers in Rajasthan.',
    shortDescription: 'Soft handloom cotton kurta with indigo block print',
    price: 149900, // ₹1,499.00
    salePrice: 119900, // ₹1,199.00
    discountPercent: 20,
    stock: 42,
    inStock: true,
    sku: 'MUV-KUR-001',
    isFeatured: true,
    isActive: true,
    category: { id: 'cat-kurtas', name: 'Kurtas & Apparel', slug: 'kurtas-apparel' },
    images: [
      { id: 'img-k1', url: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800&auto=format&fit=crop&q=80', altText: 'Front view', isPrimary: true, sortOrder: 0 },
      { id: 'img-k2', url: 'https://images.unsplash.com/photo-1597983073493-88cd35cf93b0?w=800&auto=format&fit=crop&q=80', altText: 'Back view', isPrimary: false, sortOrder: 1 }
    ],
    metadata: { color: 'Blue', size: 'M', material: '100% Handloom Cotton' },
    createdAt: '2026-05-01T10:00:00Z',
  },
  {
    id: 'prod-sofa-1',
    name: 'Sheesham Wood 3-Seater Sofa',
    slug: 'sheesham-wood-3-seater-sofa',
    description: 'A premium handcrafted 3-seater sofa made from seasoned Sheesham wood (Indian Rosewood). Featuring high-density foam padding wrapped in a premium breathable linen blend fabric. Designed to reflect the warm, rustic craftsmanship of classic Indian homes.',
    shortDescription: 'Premium handcrafted Sheesham wood sofa with high-density foam cushions',
    price: 3499900, // ₹34,999.00
    salePrice: 2899900, // ₹28,999.00
    discountPercent: 17,
    stock: 12,
    inStock: true,
    sku: 'MUV-SOF-001',
    isFeatured: true,
    isActive: true,
    category: { id: 'cat-furniture', name: 'Solid Wood Furniture', slug: 'solid-wood-furniture' },
    images: [
      { id: 'img-s1', url: 'https://images.unsplash.com/photo-1540518614846-7eded433c457?w=800&auto=format&fit=crop&q=80', altText: 'Front view', isPrimary: true, sortOrder: 0 },
      { id: 'img-s2', url: 'https://images.unsplash.com/photo-1484101403633-562f891dc89a?w=800&auto=format&fit=crop&q=80', altText: 'Side angle view', isPrimary: false, sortOrder: 1 }
    ],
    metadata: { wood: 'Sheesham Wood', finish: 'Honey Finish', dimensions: '78"W x 32"D x 34"H' },
    createdAt: '2026-05-05T12:00:00Z',
  },
  {
    id: 'prod-cushion-1',
    name: 'Blockprinted Cotton Cushion Cover',
    slug: 'blockprinted-cotton-cushion-cover',
    description: 'Traditional blockprinted cushion cover made by hand in Jaipur. Uses organic vegetable dyes. Adds a beautiful ethnic touch to any sofa, bed, or lounge chair.',
    shortDescription: 'Jaipur hand-blockprinted cushion cover with organic dyes',
    price: 49900, // ₹499.00
    salePrice: null,
    discountPercent: 0,
    stock: 4, // low stock!
    inStock: true,
    sku: 'MUV-CUS-001',
    isFeatured: false,
    isActive: true,
    category: { id: 'cat-home-decor', name: 'Home Decor', slug: 'home-decor' },
    images: [
      { id: 'img-c1', url: 'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?w=800&auto=format&fit=crop&q=80', altText: 'Cushion on sofa', isPrimary: true, sortOrder: 0 }
    ],
    metadata: { material: 'Organic Cotton', size: '16x16 inches', closure: 'Hidden Zipper' },
    createdAt: '2026-05-10T14:30:00Z',
  },
  {
    id: 'prod-bedspread-1',
    name: 'Indigo Blockprint Double Bedspread',
    slug: 'indigo-blockprint-double-bedspread',
    description: 'Luxurious double bedspread with matching pillow covers. Crafted in 100% fine cotton and indigo dye block printing. Highly durable fabric that feels softer with every wash.',
    shortDescription: '100% cotton double bedspread with 2 pillow covers',
    price: 249900, // ₹2,499.00
    salePrice: 199900, // ₹1,999.00
    discountPercent: 20,
    stock: 25,
    inStock: true,
    sku: 'MUV-BED-001',
    isFeatured: true,
    isActive: true,
    category: { id: 'cat-bed-bath', name: 'Bed & Bath', slug: 'bed-bath' },
    images: [
      { id: 'img-b1', url: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=800&auto=format&fit=crop&q=80', altText: 'Bedspread layout', isPrimary: true, sortOrder: 0 }
    ],
    metadata: { size: 'Double Bed (90x108 inches)', material: '100% Cotton', count: '144 TC' },
    createdAt: '2026-05-12T08:15:00Z',
  },
  {
    id: 'prod-table-1',
    name: 'Sheesham Coffee Table with Drawers',
    slug: 'sheesham-coffee-table-with-drawers',
    description: 'Exquisite low-profile solid wood coffee table. Features two storage drawers with antique brass pull ring handles. Made with beautiful natural wood grains and a warm honey finish.',
    shortDescription: 'Low profile solid wood coffee table with 2 drawers',
    price: 1299900, // ₹12,999.00
    salePrice: 999900, // ₹9,999.00
    discountPercent: 23,
    stock: 8,
    inStock: true,
    sku: 'MUV-TAB-001',
    isFeatured: false,
    isActive: true,
    category: { id: 'cat-furniture', name: 'Solid Wood Furniture', slug: 'solid-wood-furniture' },
    images: [
      { id: 'img-t1', url: 'https://images.unsplash.com/photo-1533090161767-e6ffed986c88?w=800&auto=format&fit=crop&q=80', altText: 'Coffee table view', isPrimary: true, sortOrder: 0 }
    ],
    metadata: { wood: 'Sheesham Wood', finish: 'Warm Honey', dimensions: '36"W x 20"D x 16"H' },
    createdAt: '2026-05-15T09:45:00Z',
  },
  {
    id: 'prod-vase-1',
    name: 'Handcrafted Terracotta Ceramic Vase',
    slug: 'handcrafted-terracotta-ceramic-vase',
    description: 'Rustic handmade ceramic vase in warm terracotta tones. Ideal for dry grass decorations or as a standalone shelf art piece.',
    shortDescription: 'Rustic handmade ceramic terracotta vase',
    price: 89900, // ₹899.00
    salePrice: null,
    discountPercent: 0,
    stock: 0, // out of stock!
    inStock: false,
    sku: 'MUV-VAS-001',
    isFeatured: false,
    isActive: true,
    category: { id: 'cat-home-decor', name: 'Home Decor', slug: 'home-decor' },
    images: [
      { id: 'img-v1', url: 'https://images.unsplash.com/photo-1578500494198-246f612d3b3d?w=800&auto=format&fit=crop&q=80', altText: 'Vase close up', isPrimary: true, sortOrder: 0 }
    ],
    metadata: { height: '12 inches', weight: '1.2 kg', design: 'Traditional Terracotta' },
    createdAt: '2026-05-18T16:00:00Z',
  },
];

// Seed Coupons
const initialCoupons: Coupon[] = [
  {
    id: 'coup-diwali',
    code: 'DIWALI20',
    discountType: 'percentage',
    discountValue: 20,
    minOrderAmount: 50000, // ₹500
    maxDiscountAmount: 100000, // ₹1,000
    usageLimit: 500,
    validFrom: '2026-10-15T00:00:00Z',
    validUntil: '2026-11-05T23:59:59Z',
    isActive: true,
  },
  {
    id: 'coup-welcome',
    code: 'WELCOME10',
    discountType: 'percentage',
    discountValue: 10,
    minOrderAmount: 0,
    maxDiscountAmount: 50000, // ₹500
    usageLimit: 10000,
    validFrom: '2026-01-01T00:00:00Z',
    validUntil: '2026-12-31T23:59:59Z',
    isActive: true,
  },
  {
    id: 'coup-flat100',
    code: 'MUVIRA100',
    discountType: 'fixed',
    discountValue: 10000, // ₹100
    minOrderAmount: 100000, // ₹1,000
    maxDiscountAmount: 10000, // ₹100
    usageLimit: 200,
    validFrom: '2026-06-01T00:00:00Z',
    validUntil: '2026-08-31T23:59:59Z',
    isActive: true,
  },
];

// Seed Campaigns
const initialCampaigns: Campaign[] = [
  {
    id: 'camp-diwali',
    name: 'Diwali Festival Sale',
    slug: 'diwali-sale',
    description: 'Celebrate the festival of lights with handcrafted home products and ethnic apparel. Up to 30% off on all items.',
    bannerImageUrl: 'https://images.unsplash.com/photo-1605649487212-47bdab064df7?w=1600&auto=format&fit=crop&q=80',
    discountType: 'percentage',
    discountValue: 30,
    startDate: '2026-10-15T00:00:00Z',
    endDate: '2026-11-05T23:59:59Z',
    productIds: ['prod-kurta-1', 'prod-sofa-1', 'prod-bedspread-1', 'prod-table-1'],
    categoryIds: [],
    applyToAll: true,
    isActive: true,
  },
];

// Seed Users
const initialUsers = [
  {
    email: 'admin@muvira.com',
    password: 'admin123',
    profile: {
      id: 'usr-admin',
      fullName: 'Asha Roy (Admin)',
      phone: '+919876543210',
      role: 'admin' as const,
      createdAt: '2026-01-01T00:00:00Z',
      email: 'admin@muvira.com',
    },
  },
  {
    email: 'user@muvira.com',
    password: 'user123',
    profile: {
      id: 'usr-user',
      fullName: 'Asha Roy',
      phone: '+919876543210',
      role: 'user' as const,
      createdAt: '2026-01-10T00:00:00Z',
      email: 'user@muvira.com',
    },
  },
];

// Seed Addresses
const initialAddresses: Address[] = [
  {
    id: 'addr-default',
    label: 'home',
    fullName: 'Asha Roy',
    phone: '+919876543210',
    line1: '12 Park Street',
    line2: 'Flat 4B',
    city: 'Kolkata',
    state: 'West Bengal',
    pincode: '700016',
    country: 'India',
    isDefault: true,
  },
];

// Seed Orders
const initialOrders: OrderDetail[] = [
  {
    id: 'ord-123',
    orderNumber: 'MUV-000123',
    status: 'confirmed',
    paymentStatus: 'paid',
    fulfillmentStatus: 'unfulfilled',
    subtotal: 239800, // ₹2,398
    discountAmount: 47960, // 20% of subtotal (₹479.60)
    shippingAmount: 0,
    taxAmount: 0,
    totalAmount: 191840, // ₹1,918.40
    couponCode: 'DIWALI20',
    shippingAddress: {
      fullName: 'Asha Roy',
      phone: '+919876543210',
      line1: '12 Park Street',
      line2: 'Flat 4B',
      city: 'Kolkata',
      state: 'West Bengal',
      pincode: '700016',
      country: 'India',
    },
    carrierName: null,
    trackingId: null,
    items: [
      {
        id: 'orditem-1',
        productId: 'prod-kurta-1',
        productName: 'Cotton Handloom Kurta',
        productImage: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800&auto=format&fit=crop&q=80',
        unitPrice: 119900,
        quantity: 2,
        totalPrice: 239800,
      },
    ],
    createdAt: '2026-06-10T14:22:00Z',
    updatedAt: '2026-06-10T14:25:00Z',
    customer: {
      id: 'usr-user',
      fullName: 'Asha Roy',
      phone: '+919876543210',
      email: 'user@muvira.com',
    },
    adminNotes: [
      {
        id: 'note-1',
        note: 'Customer requested eco-friendly packaging',
        createdAt: '2026-06-10T15:00:00Z',
        createdBy: 'Admin Assistant',
      },
    ],
  },
];

// Seed Cart
const initialCart: Cart = {
  items: [],
  subtotal: 0,
  itemCount: 0,
};

// Initialize DB in LocalStorage
export class MockDatabase {
  static get<T>(key: string, defaultValue: T): T {
    const data = localStorage.getItem(`muvira_db_${key}`);
    return data ? JSON.parse(data) : defaultValue;
  }

  static set<T>(key: string, value: T): void {
    localStorage.setItem(`muvira_db_${key}`, JSON.stringify(value));
  }

  static getCategories(): Category[] {
    return this.get<Category[]>('categories', initialCategories);
  }

  static setCategories(categories: Category[]): void {
    this.set('categories', categories);
  }

  static getProducts(): ProductDetail[] {
    return this.get<ProductDetail[]>('products', initialProducts);
  }

  static setProducts(products: ProductDetail[]): void {
    this.set('products', products);
  }

  static getCoupons(): Coupon[] {
    return this.get<Coupon[]>('coupons', initialCoupons);
  }

  static setCoupons(coupons: Coupon[]): void {
    this.set('coupons', coupons);
  }

  static getCampaigns(): Campaign[] {
    return this.get<Campaign[]>('campaigns', initialCampaigns);
  }

  static setCampaigns(campaigns: Campaign[]): void {
    this.set('campaigns', campaigns);
  }

  static getUsers() {
    return this.get('users', initialUsers);
  }

  static setUsers(users: any[]) {
    this.set('users', users);
  }

  static getAddresses(): Address[] {
    return this.get<Address[]>('addresses', initialAddresses);
  }

  static setAddresses(addresses: Address[]): void {
    this.set('addresses', addresses);
  }

  static getOrders(): OrderDetail[] {
    return this.get<OrderDetail[]>('orders', initialOrders);
  }

  static setOrders(orders: OrderDetail[]): void {
    this.set('orders', orders);
  }

  static getCart(): Cart {
    return this.get<Cart>('cart', initialCart);
  }

  static setCart(cart: Cart): void {
    this.set('cart', cart);
  }

  static getActiveUser(): Profile | null {
    const user = localStorage.getItem('muvira_db_active_user');
    return user ? JSON.parse(user) : null;
  }

  static setActiveUser(user: Profile | null): void {
    if (user) {
      localStorage.setItem('muvira_db_active_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('muvira_db_active_user');
    }
  }

  static getErrorToggles(): Record<string, boolean> {
    return this.get<Record<string, boolean>>('error_toggles', {
      simulateServerErrors: false,
      simulateOutofStock: false,
      simulateCouponError: false,
      simulatePaymentError: false,
    });
  }

  static setErrorToggles(toggles: Record<string, boolean>): void {
    this.set('error_toggles', toggles);
  }

  static resetDatabase(): void {
    localStorage.removeItem('muvira_db_categories');
    localStorage.removeItem('muvira_db_products');
    localStorage.removeItem('muvira_db_coupons');
    localStorage.removeItem('muvira_db_campaigns');
    localStorage.removeItem('muvira_db_users');
    localStorage.removeItem('muvira_db_addresses');
    localStorage.removeItem('muvira_db_orders');
    localStorage.removeItem('muvira_db_cart');
    localStorage.removeItem('muvira_db_active_user');
    localStorage.removeItem('muvira_db_error_toggles');
    window.location.reload();
  }
}
