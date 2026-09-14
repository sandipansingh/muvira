import type { Profile } from '../types/auth'
import type { ProductListItem, ProductDetail, ProductImage, ProductReview } from '../types/product'
import type { Category } from '../types/category'
import type { Cart, CartItem, Address } from '../types/cart'
import type { OrderListItem, OrderDetail, OrderItem, OrderAddress, AdminNote } from '../types/order'
import type { Coupon, CouponPreview } from '../types/coupon'
import type { DashboardStats, InventoryItem } from '../types/dashboard'
import type { SiteSettings } from '../types/settings'

/**
 * Anti-Corruption Layer (Adapters).
 * Converts backend snake_case DB/API representations into clean, typed frontend camelCase models.
 */

export function mapProfile(raw: Record<string, unknown>): Profile {
  return {
    id: raw['id'] as string,
    fullName: (raw['full_name'] as string | null) ?? '',
    phone: (raw['phone'] as string | null) ?? '',
    role: (raw['role'] as Profile['role'] | undefined) ?? 'customer',
    createdAt: raw['created_at'] as string,
    email: raw['email'] as string | undefined,
  }
}

function mapProductImage(raw: Record<string, unknown>): ProductImage {
  return {
    id: raw['id'] as string,
    url: raw['url'] as string,
    altText: (raw['alt_text'] as string | null) ?? '',
    isPrimary: raw['is_primary'] as boolean,
    sortOrder: (raw['sort_order'] as number) ?? 0,
  }
}

function mapRelation(raw: unknown): Record<string, unknown> | undefined {
  if (Array.isArray(raw)) return raw[0] as Record<string, unknown> | undefined
  return raw as Record<string, unknown> | undefined
}

export function mapProductListItem(raw: Record<string, unknown>): ProductListItem {
  const images = (raw['product_images'] as Record<string, unknown>[] | undefined) ?? []
  const primaryImage = images.find((img) => img['is_primary']) ?? images[0]
  const pricePaisa = raw['price_paisa'] as number
  const compareAtPaisa = raw['compare_at_price_paisa'] as number | null

  const hasDiscount = compareAtPaisa !== null && compareAtPaisa > pricePaisa
  const price = pricePaisa
  const salePrice = hasDiscount ? compareAtPaisa : null
  const discountPercent = hasDiscount
    ? Math.round(((compareAtPaisa - pricePaisa) / compareAtPaisa) * 100)
    : 0

  const cat = mapRelation(raw['categories'])

  return {
    id: raw['id'] as string,
    name: raw['name'] as string,
    slug: raw['slug'] as string,
    shortDescription: (raw['short_description'] as string | null) ?? '',
    price,
    salePrice,
    discountPercent,
    stock: raw['stock'] as number,
    inStock: (raw['stock'] as number) > 0,
    isFeatured: raw['is_featured'] as boolean,
    categoryId: raw['category_id'] as string,
    categoryName: (cat?.['name'] as string | undefined) ?? (raw['category_name'] as string) ?? '',
    primaryImageUrl: (primaryImage?.['url'] as string | undefined) ?? '',
    createdAt: raw['created_at'] as string,
    rating: (raw['rating'] as number | null | undefined) ?? null,
    reviewCount:
      (raw['review_count'] as number | undefined) ??
      (raw['reviewCount'] as number | undefined) ??
      0,
  }
}

export function mapProductDetail(raw: Record<string, unknown>): ProductDetail {
  const images = (raw['product_images'] as Record<string, unknown>[] | undefined) ?? []
  const pricePaisa = raw['price_paisa'] as number
  const compareAtPaisa = raw['compare_at_price_paisa'] as number | null

  const hasDiscount = compareAtPaisa !== null && compareAtPaisa > pricePaisa
  const price = pricePaisa
  const salePrice = hasDiscount ? compareAtPaisa : null
  const discountPercent = hasDiscount
    ? Math.round(((compareAtPaisa - pricePaisa) / compareAtPaisa) * 100)
    : 0

  const catRaw = mapRelation(raw['categories'])
  const cat = catRaw ?? { id: raw['category_id'], name: '', slug: '' }

  return {
    id: raw['id'] as string,
    name: raw['name'] as string,
    slug: raw['slug'] as string,
    description: (raw['description'] as string | null) ?? '',
    shortDescription: (raw['short_description'] as string | null) ?? '',
    price,
    salePrice,
    discountPercent,
    stock: raw['stock'] as number,
    inStock: (raw['stock'] as number) > 0,
    sku: (raw['sku'] as string | null) ?? '',
    isFeatured: raw['is_featured'] as boolean,
    isActive: raw['is_active'] as boolean,
    category: {
      id: cat['id'] as string,
      name: cat['name'] as string,
      slug: cat['slug'] as string,
    },
    images: images.map(mapProductImage),
    metadata: (raw['metadata'] as Record<string, string> | null) ?? {},
    createdAt: raw['created_at'] as string,
    rating: (raw['rating'] as number | null | undefined) ?? null,
    reviewCount:
      (raw['review_count'] as number | undefined) ??
      (raw['reviewCount'] as number | undefined) ??
      0,
  }
}

export function mapCategory(raw: Record<string, unknown>): Category {
  return {
    id: raw['id'] as string,
    name: raw['name'] as string,
    slug: raw['slug'] as string,
    description: (raw['description'] as string | null) ?? '',
    imageUrl: (raw['image_url'] as string | null) ?? '',
    sortOrder: (raw['sort_order'] as number) ?? 0,
    isActive: raw['is_active'] as boolean,
    itemCount: (raw['item_count'] as number | undefined) ?? (raw['product_count'] as number),
    showInNavbar: raw['show_in_navbar'] as boolean | undefined,
  }
}

export function mapCartItem(raw: Record<string, unknown>): CartItem {
  const products = raw['products']
  const prod = Array.isArray(products)
    ? (products[0] as Record<string, unknown> | undefined)
    : (products as Record<string, unknown> | undefined)
  const images = (prod?.['product_images'] as Record<string, unknown>[] | undefined) ?? []
  const primaryImage = images.find((img) => img['is_primary']) ?? images[0]
  const unitPrice = (prod?.['price_paisa'] as number) ?? 0
  const quantity = raw['quantity'] as number

  return {
    id: raw['id'] as string,
    productId: raw['product_id'] as string,
    productName: (prod?.['name'] as string) ?? '',
    productSlug: (prod?.['slug'] as string) ?? '',
    productImage: (primaryImage?.['url'] as string | undefined) ?? '',
    unitPrice,
    quantity,
    lineTotal: unitPrice * quantity,
    inStock: prod?.['is_active'] === true && ((prod?.['stock'] as number) ?? 0) > 0,
    availableStock: (prod?.['stock'] as number) ?? 0,
  }
}

export function buildCart(rawItems: Record<string, unknown>[]): Cart {
  const items = rawItems.map(mapCartItem)
  return {
    items,
    subtotal: items.reduce((s, i) => s + i.lineTotal, 0),
    itemCount: items.reduce((s, i) => s + i.quantity, 0),
  }
}

export function mapAddress(raw: Record<string, unknown>): Address {
  return {
    id: raw['id'] as string,
    label: (raw['label'] as string | undefined) ?? 'Address',
    fullName: (raw['full_name'] as string) ?? '',
    phone: (raw['phone'] as string) ?? '',
    line1: (raw['address_line1'] as string) ?? '',
    line2: (raw['address_line2'] as string | null) ?? null,
    city: (raw['city'] as string) ?? '',
    state: (raw['state'] as string) ?? '',
    pincode: (raw['pincode'] as string) ?? '',
    country: (raw['country'] as string) ?? 'India',
    isDefault: (raw['is_default'] as boolean) ?? false,
  }
}

export function mapOrderListItem(raw: Record<string, unknown>): OrderListItem {
  const items = (raw['order_items'] as Record<string, unknown>[] | undefined) ?? []
  const firstItem = items[0]
  return {
    id: raw['id'] as string,
    orderNumber: raw['order_number'] as string,
    status: raw['status'] as OrderListItem['status'],
    paymentStatus: raw['payment_status'] as OrderListItem['paymentStatus'],
    fulfillmentStatus: raw['fulfillment_status'] as OrderListItem['fulfillmentStatus'],
    fulfillmentStep: (raw['fulfillment_step'] as OrderListItem['fulfillmentStep']) ?? null,
    totalAmount: raw['total_amount_paisa'] as number,
    itemCount: items.reduce((s, i) => s + ((i['quantity'] as number) ?? 0), 0),
    firstItemName: firstItem?.['product_name'] as string | undefined,
    firstItemImage: firstItem?.['product_image_url'] as string | undefined,
    createdAt: raw['created_at'] as string,
    awbCode: (raw['awb_code'] as string | null) ?? null,
  }
}

export function mapOrderItem(raw: Record<string, unknown>): OrderItem {
  return {
    id: raw['id'] as string,
    productId: raw['product_id'] as string,
    productName: raw['product_name'] as string,
    productImage: (raw['product_image_url'] as string | null) ?? '',
    unitPrice: raw['unit_price_paisa'] as number,
    quantity: raw['quantity'] as number,
    totalPrice: raw['total_price_paisa'] as number,
  }
}

export function mapOrderAddress(raw: Record<string, unknown>): OrderAddress {
  return {
    fullName: raw['shipping_full_name'] as string,
    phone: raw['shipping_phone'] as string,
    line1: raw['shipping_address_line1'] as string,
    line2: (raw['shipping_address_line2'] as string | null) ?? null,
    city: raw['shipping_city'] as string,
    state: raw['shipping_state'] as string,
    pincode: raw['shipping_pincode'] as string,
    country: raw['shipping_country'] as string,
  }
}

export function mapOrderDetail(raw: Record<string, unknown>): OrderDetail {
  const items = (raw['order_items'] as Record<string, unknown>[] | undefined) ?? []
  const profile = raw['profiles'] as Record<string, unknown> | undefined

  const rawNotes = (raw['notes'] as string | null) ?? ''
  let deliveryInstructions: string | null = null
  const adminNotes: AdminNote[] = []

  if (rawNotes) {
    const lines = rawNotes.split('\n')
    lines.forEach((line, idx) => {
      const match = line.match(/^\[([^\]]+)\]\s*(.*)$/)
      if (match) {
        adminNotes.push({
          id: String(idx),
          note: match[2],
          createdBy: 'Admin',
          createdAt: match[1],
        })
      } else {
        if (deliveryInstructions) {
          deliveryInstructions += '\n' + line
        } else {
          deliveryInstructions = line
        }
      }
    })
  }

  return {
    id: raw['id'] as string,
    orderNumber: raw['order_number'] as string,
    status: raw['status'] as OrderDetail['status'],
    paymentStatus: raw['payment_status'] as OrderDetail['paymentStatus'],
    fulfillmentStatus: raw['fulfillment_status'] as OrderDetail['fulfillmentStatus'],
    fulfillmentStep: (raw['fulfillment_step'] as OrderDetail['fulfillmentStep']) ?? null,
    subtotal: raw['subtotal_paisa'] as number,
    discountAmount: raw['discount_amount_paisa'] as number,
    shippingAmount: raw['shipping_amount_paisa'] as number,
    totalAmount: raw['total_amount_paisa'] as number,
    couponCode: (raw['coupon_code'] as string | null) ?? null,
    paymentMethod: (raw['payment_method'] as string | null) ?? null,
    shippingMethod:
      (raw['shipping_method'] as OrderDetail['shippingMethod'] | undefined) ?? 'standard',
    shippingAddress: mapOrderAddress(raw),
    awbCode: (raw['awb_code'] as string | null) ?? null,
    shiprocketOrderId: (raw['shiprocket_order_id'] as string | null) ?? null,
    shiprocketStatus: (raw['shiprocket_status'] as string | null) ?? null,
    shiprocketError: (raw['shiprocket_error'] as string | null) ?? null,
    shipmentId: (raw['shipment_id'] as string | null) ?? null,
    courierName: (raw['courier_name'] as string | null) ?? null,
    trackingUrl: (raw['tracking_url'] as string | null) ?? null,
    pickupScheduledDate: (raw['pickup_scheduled_date'] as string | null) ?? null,
    pickupTokenNumber: (raw['pickup_token_number'] as string | null) ?? null,
    labelGenerated: (raw['label_generated'] as boolean) ?? false,
    manifestGenerated: (raw['manifest_generated'] as boolean) ?? false,
    packageWeightGrams: (raw['package_weight_grams'] as number | null) ?? null,
    packageLengthCm: (raw['package_length_cm'] as number | null) ?? null,
    packageBreadthCm: (raw['package_breadth_cm'] as number | null) ?? null,
    packageHeightCm: (raw['package_height_cm'] as number | null) ?? null,
    items: items.map(mapOrderItem),
    createdAt: raw['created_at'] as string,
    updatedAt: raw['updated_at'] as string,
    customer: profile
      ? {
          id: raw['user_id'] as string,
          fullName: (profile['full_name'] as string | null) ?? '',
          phone: (profile['phone'] as string | null) ?? '',
          email: (profile['email'] as string) ?? '',
        }
      : undefined,
    adminNotes,
    deliveryInstructions,
  }
}

export function mapCoupon(raw: Record<string, unknown>): Coupon {
  return {
    id: raw['id'] as string,
    code: raw['code'] as string,
    description: (raw['description'] as string | null) ?? null,
    discountType: raw['discount_type'] as 'percentage' | 'fixed',
    discountValue: raw['discount_value'] as number,
    minOrderAmount: raw['min_order_amount_paisa'] as number,
    maxDiscountAmount: (raw['max_discount_paisa'] as number | null) ?? null,
    usageLimit: (raw['max_uses'] as number | null) ?? null,
    timesUsed: (raw['times_used'] as number) ?? 0,
    validFrom: raw['valid_from'] as string,
    validUntil: (raw['valid_until'] as string | null) ?? null,
    isActive: raw['is_active'] as boolean,
  }
}

export function mapCouponPreview(raw: Record<string, unknown>): CouponPreview {
  const subtotalPaisa = (raw['subtotal_paisa'] as number | undefined) ?? 0
  const discountPaisa = raw['discount_amount_paisa'] as number
  return {
    code: raw['code'] as string,
    discountType: raw['discount_type'] as 'percentage' | 'fixed',
    discountValue: raw['discount_value'] as number,
    discountAmount: discountPaisa,
    newSubtotal: subtotalPaisa - discountPaisa,
  }
}

export function mapDashboardStats(raw: Record<string, unknown>): DashboardStats {
  return {
    totalOrders: (raw['total_orders'] as number) ?? 0,
    ordersToday: (raw['orders_today'] as number) ?? 0,
    totalRevenue: (raw['total_revenue_paisa'] as number) ?? 0,
    revenueToday: (raw['revenue_today_paisa'] as number) ?? 0,
    totalProducts: (raw['total_products'] as number) ?? 0,
    activeProducts: (raw['active_products'] as number) ?? 0,
    totalCategories: (raw['total_categories'] as number) ?? 0,
    activeCoupons: (raw['active_coupons'] as number) ?? 0,
    lowStockCount: (raw['low_stock_count'] as number) ?? 0,
    pendingOrders: (raw['pending_orders'] as number) ?? 0,
    confirmedOrders: (raw['confirmed_orders'] as number) ?? 0,
  }
}

export function mapInventoryItem(raw: Record<string, unknown>): InventoryItem {
  return {
    productId: raw['id'] as string,
    productName: raw['name'] as string,
    sku: (raw['sku'] as string | null) ?? '',
    stock: raw['stock'] as number,
    isLowStock: (raw['stock'] as number) <= 10,
  }
}

export function mapProductReview(raw: Record<string, unknown>): ProductReview {
  return {
    id: raw['id'] as string,
    productId: (raw['product_id'] as string) ?? (raw['productId'] as string) ?? '',
    userId: (raw['user_id'] as string) ?? (raw['userId'] as string) ?? '',
    rating: raw['rating'] as number,
    comment: (raw['comment'] as string) ?? null,
    createdAt: (raw['created_at'] as string) ?? (raw['createdAt'] as string) ?? '',
    updatedAt: (raw['updated_at'] as string) ?? (raw['updatedAt'] as string) ?? undefined,
    userName:
      (raw['user_name'] as string | null | undefined) ??
      (raw['userName'] as string | null | undefined) ??
      null,
  }
}

export function mapSiteSettings(raw: Record<string, unknown>): SiteSettings {
  const contactRaw = (raw['contact_info'] as Record<string, unknown>) ?? {}
  const announcementRaw = (raw['announcement_bar'] as Record<string, unknown>) ?? {}
  const slidesRaw = (raw['hero_slides'] as Record<string, unknown>[]) ?? []
  const bannersRaw = (raw['promo_banners'] as Record<string, unknown>[]) ?? []
  const shippingRaw = (raw['shipping_rules'] as Record<string, unknown>) ?? {}
  const shiprocketRaw = (raw['shiprocket_settings'] as Record<string, unknown>) ?? {}

  return {
    contactInfo: {
      email: (contactRaw['email'] as string) ?? '',
      phone: (contactRaw['phone'] as string) ?? '',
      address: (contactRaw['address'] as string) ?? '',
    },
    announcementBar: {
      enabled: (announcementRaw['enabled'] as boolean) ?? false,
      badge: (announcementRaw['badge'] as string) ?? '',
      message: (announcementRaw['message'] as string) ?? '',
    },
    heroSlides: slidesRaw.map((s) => ({
      id: s['id'] as string,
      title: s['title'] as string,
      subtitle: (s['subtitle'] as string) ?? '',
      imageUrl: (s['imageUrl'] as string) ?? (s['image_url'] as string) ?? '',
      link: (s['link'] as string) ?? '/',
    })),
    promoBanners: bannersRaw.map((b) => ({
      id: b['id'] as string,
      title: b['title'] as string,
      subtitle: (b['subtitle'] as string) ?? '',
      imageUrl: (b['imageUrl'] as string) ?? (b['image_url'] as string) ?? '',
      link: (b['link'] as string) ?? '/',
    })),
    storeDescription: (raw['store_description'] as string) ?? '',
    shippingRules: {
      shippingChargePaisa: (shippingRaw['shipping_charge_paisa'] as number) ?? 15000,
      freeShippingThresholdPaisa:
        (shippingRaw['free_shipping_threshold_paisa'] as number) ?? 100000,
    },
    shiprocketSettings: {
      pickupLocation: (shiprocketRaw['pickup_location'] as string) ?? '',
      defaultLengthCm: (shiprocketRaw['default_length_cm'] as number) ?? 15,
      defaultBreadthCm: (shiprocketRaw['default_breadth_cm'] as number) ?? 10,
      defaultHeightCm: (shiprocketRaw['default_height_cm'] as number) ?? 5,
      defaultWeightGrams: (shiprocketRaw['default_weight_grams'] as number) ?? 500,
    },
  }
}
