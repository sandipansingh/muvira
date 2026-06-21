export interface Campaign {
  id: string;
  name: string;
  slug: string;
  description: string;
  bannerImageUrl: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  startDate: string;
  endDate: string;
  productIds?: string[];
  categoryIds?: string[];
  applyToAll?: boolean;
  isActive: boolean;
}
