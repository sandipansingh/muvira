import type { SupabaseClient } from "@supabase/supabase-js";

// Auth

export interface AuthUser {
  id: string;
  email: string;
  role: "user" | "admin";
}

// Express augmentation

declare global {
  namespace Express {
    interface Request {
      /** Verified user identity — populated by requireAuth middleware */
      user?: AuthUser;
      /** Raw JWT string — used to construct user-scoped Supabase client */
      token?: string;
      /**
       * User-scoped Supabase client. RLS is active on this client — only the
       * authenticated user's rows are visible. Populated by requireAuth.
       */
      supabase?: SupabaseClient;
      /** UUID assigned per-request for correlation in logs and error responses */
      requestId?: string;
      /** Raw request body buffer — only populated on the webhook route */
      rawBody?: Buffer;
    }
  }
}

// Pagination

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// Standard API shapes

export interface ApiSuccess<T = unknown> {
  success: true;
  data: T;
  meta?: PaginationMeta;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    fieldErrors?: Record<string, string[]>;
  };
}

// Domain models (mirrors DB schema)

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  role: "user" | "admin";
  created_at: string;
  updated_at: string;
}

export interface Address {
  id: string;
  user_id: string;
  full_name: string;
  phone: string;
  address_line1: string;
  address_line2: string | null;
  city: string;
  state: string;
  pincode: string;
  country: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  parent_id: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  short_description: string | null;
  category_id: string;
  price_paisa: number;
  compare_at_price_paisa: number | null;
  cost_price_paisa: number | null;
  sku: string | null;
  stock: number;
  weight_grams: number | null;
  is_active: boolean;
  is_featured: boolean;
  tags: string[] | null;
  meta_title: string | null;
  meta_description: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProductImage {
  id: string;
  product_id: string;
  url: string;
  alt_text: string | null;
  sort_order: number;
  is_primary: boolean;
  created_at: string;
}

export interface CartItem {
  id: string;
  user_id: string;
  product_id: string;
  quantity: number;
  created_at: string;
  updated_at: string;
}

export interface Coupon {
  id: string;
  code: string;
  description: string | null;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  min_order_amount_paisa: number;
  max_discount_paisa: number | null;
  max_uses: number | null;
  times_used: number;
  is_active: boolean;
  valid_from: string;
  valid_until: string | null;
  created_at: string;
  updated_at: string;
}

export interface SalesCampaign {
  id: string;
  name: string;
  description: string | null;
  banner_image_url: string | null;
  discount_percentage: number | null;
  is_active: boolean;
  starts_at: string;
  ends_at: string;
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: string;
  order_number: string;
  user_id: string;
  status:
    | "pending"
    | "confirmed"
    | "processing"
    | "shipped"
    | "delivered"
    | "cancelled"
    | "refunded";
  payment_status: "pending" | "paid" | "failed" | "refunded";
  fulfillment_status: "unfulfilled" | "partial" | "fulfilled" | "exception";
  // Shipping address snapshot
  shipping_full_name: string;
  shipping_phone: string;
  shipping_address_line1: string;
  shipping_address_line2: string | null;
  shipping_city: string;
  shipping_state: string;
  shipping_pincode: string;
  shipping_country: string;
  // Amounts (paisa)
  subtotal_paisa: number;
  discount_amount_paisa: number;
  shipping_amount_paisa: number;
  tax_amount_paisa: number;
  total_amount_paisa: number;
  // Coupon
  coupon_id: string | null;
  coupon_code: string | null;
  coupon_discount_paisa: number;
  // Fulfillment (manual tracking only)
  carrier_name: string | null;
  tracking_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  // Immutable snapshots at time of order
  product_name: string;
  product_sku: string | null;
  product_image_url: string | null;
  quantity: number;
  unit_price_paisa: number;
  total_price_paisa: number;
  created_at: string;
}

export interface Payment {
  id: string;
  order_id: string;
  razorpay_order_id: string;
  razorpay_payment_id: string | null;
  razorpay_signature: string | null;
  amount_paisa: number;
  currency: string;
  status: "created" | "captured" | "failed" | "refunded";
  failure_reason: string | null;
  captured_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaymentLog {
  id: string;
  payment_id: string | null;
  order_id: string | null;
  event_type:
    | "created"
    | "verify_attempt"
    | "verify_success"
    | "verify_failure"
    | "webhook_received"
    | "webhook_processed"
    | "webhook_duplicate"
    | "webhook_failed";
  payload: Record<string, unknown> | null;
  razorpay_event_id: string | null;
  created_at: string;
}

// Checkout

export interface CheckoutTotals {
  subtotal_paisa: number;
  discount_amount_paisa: number;
  shipping_amount_paisa: number;
  tax_amount_paisa: number;
  total_amount_paisa: number;
}

// AppError

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly fieldErrors?: Record<string, string[]>,
  ) {
    super(message);
    this.name = "AppError";
    Object.setPrototypeOf(this, AppError.prototype);
  }
}
