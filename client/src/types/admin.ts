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

interface CommerceFailureBase {
  id: string
  orderId: string | null
  label: string
  lastError: string | null
  updatedAt: string
  state?: string
  amountPaisa?: number | null
  currency?: string | null
}

export interface StandardCommerceFailureItem extends CommerceFailureBase {
  kind: 'outbox' | 'invoice' | 'payment_reconciliation' | 'operational_alert'
}

export interface ProviderOperationFailureItem extends CommerceFailureBase {
  kind: 'provider_operation'
  provider: string
  operationType: string
  businessKey: string
  targetType: string
  target: string
  providerStatus: string | null
  dispatchAttempts: number
  reconciliationAttempts: number
  manualReviewReason: string | null
  localCompletionPending: boolean
}

export interface RetainedCheckoutFailureItem extends CommerceFailureBase {
  kind: 'retained_checkout'
  deadlineAt: string
  extensionCount: number
  escalation: 'warning' | 'critical'
  lastVerifiedAt: string
  providerStatus: string
}

export interface LateCaptureWatchFailureItem extends CommerceFailureBase {
  kind: 'late_capture_watch'
  provider: 'razorpay'
  target: string
  providerStatus: string | null
  lastCheckedAt: string | null
}

export type CommerceFailureItem =
  | StandardCommerceFailureItem
  | ProviderOperationFailureItem
  | RetainedCheckoutFailureItem
  | LateCaptureWatchFailureItem

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
