export type AdminSection = 'overview' | 'orders' | 'catalog' | 'coupons' | 'settings' | 'failures'

export interface UploadImageResult {
  url: string
  path: string
  fileName: string
}

export interface RetryJob {
  id: string
  jobType: string
  referenceId: string | null
  status: string
  retryCount: number
  maxRetries: number
  lastError: string | null
  nextRetryAt: string
  createdAt: string
}

export interface NotificationDeliverySummary {
  id: string
  orderId: string
  eventType: string
  status: string
  attempts: number
  lastError: string | null
  providerMessageId: string | null
  availableAt: string
  sentAt: string | null
  createdAt: string
}

export interface CommerceFailureItem {
  id: string
  orderId: string | null
  kind: 'outbox' | 'invoice' | 'payment_reconciliation' | 'operational_alert'
  label: string
  lastError: string | null
  updatedAt: string
}

export interface WebhookFailureItem {
  id: string
  source: string
  eventType: string | null
  eventId: string | null
  retryCount: number
  lastError: string | null
  updatedAt: string
}

export interface AdminProductInput {
  name: string
  slug?: string
  description?: string
  shortDescription?: string
  categoryId: string
  pricePaisa: number
  compareAtPricePaisa?: number | null
  sku?: string
  stock: number
  isActive: boolean
  isFeatured: boolean
  metadata?: Record<string, string>
}

export type AdminProductPatch = Partial<AdminProductInput>

export interface AdminCategoryInput {
  name: string
  slug?: string
  description?: string
  imageUrl?: string
  isActive?: boolean
  sortOrder?: number
  showInNavbar?: boolean
}

export interface AdminCouponInput {
  code: string
  description?: string
  discountType: 'percentage' | 'fixed'
  discountValue: number
  minOrderAmountPaisa: number
  maxDiscountPaisa?: number | null
  maxUses?: number
  isActive: boolean
  validFrom?: string
  validUntil?: string
}
