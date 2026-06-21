export interface ProductImage {
  id: string;
  url: string;
  altText: string;
  isPrimary: boolean;
  sortOrder: number;
}

export interface ProductListItem {
  id: string;
  name: string;
  slug: string;
  shortDescription: string;
  price: number; // in paisa
  salePrice: number | null; // in paisa
  discountPercent: number;
  stock: number;
  inStock: boolean;
  isFeatured: boolean;
  categoryId: string;
  categoryName: string;
  primaryImageUrl: string;
  createdAt: string;
}

export interface ProductDetail {
  id: string;
  name: string;
  slug: string;
  description: string;
  shortDescription: string;
  price: number; // in paisa
  salePrice: number | null; // in paisa
  discountPercent: number;
  stock: number;
  inStock: boolean;
  sku: string;
  isFeatured: boolean;
  isActive: boolean;
  category: {
    id: string;
    name: string;
    slug: string;
  };
  images: ProductImage[];
  metadata: Record<string, string>;
  createdAt: string;
}

export interface ProductQueryParams {
  page?: number;
  limit?: number;
  q?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  sort?: 'price_asc' | 'price_desc' | 'newest' | 'popularity';
}
