export interface Review {
  id: string
  productId: string
  userName: string
  userAvatar?: string
  rating: number
  comment: string
  createdAt: string
  verifiedPurchase?: boolean
}
