import { env } from '../config/env'
import { logger } from '../lib/logger'

const SHIPROCKET_BASE = 'https://apiv2.shiprocket.in/v1/external'

let cachedToken: string | null = null
let tokenExpiresAt: number = 0

async function getToken(): Promise<string> {
  const now = Date.now()

  if (cachedToken && now < tokenExpiresAt) {
    return cachedToken
  }

  logger.info('Shiprocket: refreshing bearer token')

  const res = await fetch(`${SHIPROCKET_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: env.SHIPROCKET_EMAIL,
      password: env.SHIPROCKET_PASSWORD,
    }),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Shiprocket auth failed (${res.status}): ${text}`)
  }

  const data = (await res.json()) as { token?: string }
  if (!data.token) throw new Error('Shiprocket auth: no token in response')

  cachedToken = data.token
  tokenExpiresAt = now + 23 * 60 * 60 * 1000

  return cachedToken
}

async function apiFetch<T>(
  path: string,
  options: { method?: string; body?: unknown } = {}
): Promise<T> {
  const token = await getToken()
  const url = `${SHIPROCKET_BASE}${path}`
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
  }

  if (options.body) {
    headers['Content-Type'] = 'application/json'
  }

  const res = await fetch(url, {
    method: options.method ?? 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Shiprocket API error (${res.status}): ${text}`)
  }

  const contentType = res.headers.get('content-type') ?? ''
  if (contentType.includes('application/pdf') || contentType.includes('application/octet-stream')) {
    return (await res.arrayBuffer()) as unknown as T
  }

  return res.json() as Promise<T>
}

//
// Types
//

export interface ShiprocketOrderInput {
  order_id: string
  order_date: string
  pickup_location: string
  channel_id?: string
  comment?: string
  billing_customer_name: string
  billing_last_name: string
  billing_address: string
  billing_address_2?: string
  billing_city: string
  billing_pincode: string
  billing_state: string
  billing_country: string
  billing_email: string
  billing_phone: string
  shipping_is_billing: boolean
  shipping_customer_name?: string
  shipping_last_name?: string
  shipping_address?: string
  shipping_address_2?: string
  shipping_city?: string
  shipping_pincode?: string
  shipping_state?: string
  shipping_country?: string
  shipping_email?: string
  shipping_phone?: string
  order_items: Array<{
    name: string
    sku: string
    units: number
    selling_price: number
    discount?: number
    tax?: number
    hsn?: number
  }>
  payment_method: 'Prepaid' | 'COD'
  shipping_charges?: number
  giftwrap_charges?: number
  transaction_charges?: number
  total_discount?: number
  sub_total: number
  length: number
  breadth: number
  height: number
  weight: number
}

export interface ShiprocketCreateOrderResponse {
  order_id: number
  shipment_id: number
  status: string
  on_hold: boolean
  is_return: boolean
}

export interface ShiprocketUpdateOrderInput {
  order_id: number
  order_date?: string
  pickup_location?: string
  billing_customer_name?: string
  billing_address?: string
  billing_city?: string
  billing_pincode?: string
  billing_state?: string
  billing_country?: string
  billing_email?: string
  billing_phone?: string
  shipping_customer_name?: string
  shipping_address?: string
  shipping_city?: string
  shipping_pincode?: string
  shipping_state?: string
  shipping_country?: string
  shipping_email?: string
  shipping_phone?: string
  order_items?: Array<{
    name: string
    sku: string
    units: number
    selling_price: number
  }>
  length?: number
  breadth?: number
  height?: number
  weight?: number
}

export interface ShiprocketAssignAwbInput {
  shipment_id: number
  courier_id?: number
  is_return?: number  // 0 = normal order, 1 = return order
  status?: string     // 'reassign' to change courier (once per 24h)
}

export interface ShiprocketAssignAwbResponse {
  awb_assign_status: number
  response: {
    data: {
      courier_company_id: number
      awb_code: string
      cod: number
      order_id: number
      shipment_id: number
      awb_code_status: number
      courier_name: string
      pickup_scheduled_date?: string
      applied_weight?: number
      routing_code?: string
      rto_routing_code?: string
    }
  }
}

export interface ShiprocketPickupInput {
  shipment_id: number[]
}

export interface ShiprocketPickupResponse {
  pickup_status: number
  response: Array<{
    shipment_id: number
    status: string
    pickup_scheduled_date: string
    pickup_token_number: string
  }>
}

export interface ShiprocketCancelOrderInput {
  ids: number[]
}

export interface ShiprocketCancelShipmentInput {
  awbs: string[]
}

export interface ShiprocketServiceabilityInput {
  pickup_pincode: string
  delivery_pincode: string
  weight: number
  cod: boolean
}

export interface ShiprocketServiceabilityResponse {
  data: {
    available_courier: Array<{
      courier_name: string
      courier_id: number
      rate: number
      estimated_delivery_days: number
      cod: boolean
    }>
    recommended_courier?: {
      courier_name: string
      courier_id: number
      rate: number
      estimated_delivery_days: number
    }
  }
  status: string
}

export interface ShiprocketPickupLocation {
  pickup_location: string
  pickup_id: number
  address: string
  city: string
  state: string
  pincode: string
  phone: string
  name: string
}

export interface ShiprocketGetOrderResponse {
  order_id: number
  shipment_id: number
  awb_code: string
  courier_name: string
  pickup_scheduled_date: string | null
  delivery_date: string | null
  status: string
  payment_method: string
  customer_name: string
  customer_address: string
  customer_city: string
  customer_state: string
  customer_pincode: string
  customer_phone: string
  order_items: Array<{
    name: string
    sku: string
    units: number
    selling_price: number
  }>
  tracking_url: string
  shipment_status: string
  pickup_location: string
}

export interface ShiprocketTrackActivity {
  date: string
  status: string
  activity: string
  location: string
  'sr-status'?: string
  'sr-status-label'?: string
}

export interface ShiprocketShipmentTrack {
  id: number
  awb_code: string
  courier_company_id: number
  shipment_id: number | null
  order_id: number
  pickup_date: string | null
  delivered_date: string | null
  weight: string
  packages: number
  current_status: string
  delivered_to: string
  destination: string
  consignee_name: string
  origin: string
  courier_name?: string
  edd?: string | null
  pod?: string | null
}

export interface ShiprocketTrackData {
  track_status: number
  shipment_status: number
  shipment_track: ShiprocketShipmentTrack[]
  shipment_track_activities: ShiprocketTrackActivity[]
  track_url: string
  etd?: string
}

//
// 1. Pickup Locations
//

export async function getPickupLocations(): Promise<ShiprocketPickupLocation[]> {
  const data = await apiFetch<{ data: { shipping_address: ShiprocketPickupLocation[] } }>(
    '/settings/company/pickup'
  )
  return data.data.shipping_address
}

//
// 2. Courier Serviceability
//

export async function checkServiceability(
  input: ShiprocketServiceabilityInput
): Promise<ShiprocketServiceabilityResponse['data']> {
  const params = new URLSearchParams({
    pickup_pincode: input.pickup_pincode,
    delivery_pincode: input.delivery_pincode,
    weight: String(input.weight),
    cod: input.cod ? '1' : '0',
  })
  const result = await apiFetch<Record<string, unknown>>(
    `/courier/serviceability/?${params.toString()}`
  )
  const raw = result as Record<string, unknown>
  logger.info({ serviceabilityRaw: JSON.stringify(raw).slice(0, 500) }, 'Shiprocket serviceability raw response')

  const str = (v: unknown, fallback = ''): string => (typeof v === 'string' ? v : fallback)
  const num = (v: unknown, fallback = 0): number => (typeof v === 'number' ? v : fallback)
  const bol = (v: unknown): boolean => v === true || v === 1 || v === '1'

  function mapCourierList(companies: Array<Record<string, unknown>>): ShiprocketServiceabilityResponse['data']['available_courier'] {
    return companies.map((c) => ({
      courier_name: str(c['courier_name']) || str(c['name']),
      courier_id: num(c['courier_company_id']) || num(c['courier_id']) || num(c['id']),
      rate: num(c['rate']) || num(c['freight_charge']),
      estimated_delivery_days: num(c['estimated_delivery_days']) || num(c['edd']),
      cod: bol(c['cod']) || bol(c['is_cod_available']),
    }))
  }

  const topData = raw['data'] as Record<string, unknown> | undefined

  if (topData?.['available_courier_companies']) {
    return { available_courier: mapCourierList(topData['available_courier_companies'] as Array<Record<string, unknown>>) }
  }
  if (topData?.['available_courier']) {
    return topData as unknown as ShiprocketServiceabilityResponse['data']
  }
  if (raw['available_courier_companies']) {
    return { available_courier: mapCourierList(raw['available_courier_companies'] as Array<Record<string, unknown>>) }
  }
  if (raw['available_courier']) {
    return raw as unknown as ShiprocketServiceabilityResponse['data']
  }
  if (raw['recommended_courier_company_id']) {
    const rec = {
      courier_name: str(raw['recommended_courier_company_name']),
      courier_id: num(raw['recommended_courier_company_id']),
      rate: num(raw['recommended_rate']),
      estimated_delivery_days: num(raw['recommended_edd']),
      cod: false,
    }
    return { available_courier: [rec], recommended_courier: rec }
  }
  if (Array.isArray(raw['data'])) {
    return { available_courier: mapCourierList(raw['data'] as Array<Record<string, unknown>>) }
  }
  return { available_courier: [] }
}

//
// 3. Create Order
//

export async function createOrder(
  input: ShiprocketOrderInput
): Promise<ShiprocketCreateOrderResponse> {
  return apiFetch<ShiprocketCreateOrderResponse>('/orders/create/adhoc', {
    method: 'POST',
    body: input,
  })
}

//
// 4. Update Order
//

export async function updateOrder(input: ShiprocketUpdateOrderInput): Promise<{ status: string }> {
  return apiFetch<{ status: string }>('/orders/update/adhoc', {
    method: 'POST',
    body: input,
  })
}

//
// 5. Assign Courier + Generate AWB
//

export async function assignAwb(
  input: ShiprocketAssignAwbInput
): Promise<ShiprocketAssignAwbResponse> {
  const result = await apiFetch<ShiprocketAssignAwbResponse | { data: ShiprocketAssignAwbResponse }>('/courier/assign/awb', {
    method: 'POST',
    body: input,
  })
  // Shiprocket sometimes wraps the entire response in a top-level 'data' key
  const raw = result as unknown as Record<string, unknown>
  if (raw['data'] && raw['data'] !== null && typeof raw['data'] === 'object' && !raw['response']) {
    return raw['data'] as unknown as ShiprocketAssignAwbResponse
  }
  return result as ShiprocketAssignAwbResponse
}

//
// 6. Schedule Pickup
//

export async function schedulePickup(
  input: ShiprocketPickupInput
): Promise<ShiprocketPickupResponse> {
  return apiFetch<ShiprocketPickupResponse>('/courier/generate/pickup', {
    method: 'POST',
    body: input,
  })
}

export interface ShiprocketGenerateLabelResponse {
  label_created: number
  label_url: string
  response?: string
  not_created?: Array<{ shipment_id: number; message: string }>
}

export interface ShiprocketGenerateManifestResponse {
  status: number
  manifest_url: string
}

//
// 7. Generate Label
//

export async function generateLabel(shipmentId: number): Promise<ShiprocketGenerateLabelResponse> {
  return apiFetch<ShiprocketGenerateLabelResponse>('/courier/generate/label', {
    method: 'POST',
    body: { shipment_id: [shipmentId] },
  })
}

//
// 8. Generate Manifest
//

export async function generateManifest(shipmentId?: number): Promise<ShiprocketGenerateManifestResponse> {
  return apiFetch<ShiprocketGenerateManifestResponse>('/manifests/generate', {
    method: 'POST',
    body: shipmentId != null ? { shipment_id: [shipmentId] } : {},
  })
}

//
// 9. Get Order Details
//

export async function getOrderDetails(orderId: number): Promise<ShiprocketGetOrderResponse> {
  return apiFetch<ShiprocketGetOrderResponse>(`/orders/show/${orderId}`)
}

//
// 10. Track by AWB
//

export async function trackSingle(awb: string): Promise<{ tracking_data: ShiprocketTrackData }> {
  return apiFetch<{ tracking_data: ShiprocketTrackData }>(
    `/courier/track/awb/${encodeURIComponent(awb)}`
  )
}

//
// 11. Track Bulk
//

export async function trackBulk(
  awbs: string[]
): Promise<Record<string, { tracking_data: ShiprocketTrackData }>> {
  if (awbs.length === 0) return {}
  return apiFetch<Record<string, { tracking_data: ShiprocketTrackData }>>('/courier/track/awbs', {
    method: 'POST',
    body: { awbs },
  })
}

//
// 12. Track by Order ID
//

export async function trackByOrder(
  orderId: number
): Promise<{ tracking_data: ShiprocketTrackData }> {
  return apiFetch<{ tracking_data: ShiprocketTrackData }>(
    `/courier/track?order_id=${orderId}`
  )
}

//
// 13. Track by Shipment ID
//

export async function trackByShipment(
  shipmentId: number
): Promise<{ tracking_data: ShiprocketTrackData }> {
  return apiFetch<{ tracking_data: ShiprocketTrackData }>(
    `/courier/track/shipment/${shipmentId}`
  )
}

//
// 14. Cancel Order
//

export async function cancelOrder(input: ShiprocketCancelOrderInput): Promise<Record<string, unknown>> {
  return apiFetch<Record<string, unknown>>('/orders/cancel', {
    method: 'POST',
    body: input,
  })
}

//
// 15. Cancel Shipment
//

export async function cancelShipment(
  input: ShiprocketCancelShipmentInput
): Promise<{ status: string }> {
  return apiFetch<{ status: string }>('/orders/cancel/shipment/awbs', {
    method: 'POST',
    body: input,
  })
}

//
// 16. Get Shipment Details (includes label_url, manifest_url)
//

export interface ShiprocketShipmentDetail {
  id: number
  order_id: number
  awb: string | null
  courier: string | null
  label_url: string | null
  manifest_url: string | null
  pickup_scheduled_date: string | null
  pickup_token_number: string | null
  status: number
}

export async function getShipmentDetails(shipmentId: number): Promise<ShiprocketShipmentDetail> {
  const result = await apiFetch<{ data: ShiprocketShipmentDetail }>(`/shipments/${shipmentId}`)
  return result.data
}

//
// 17. Generate / Download Invoice
//

export interface ShiprocketGenerateInvoiceResponse {
  is_invoice_created: boolean
  invoice_url: string | null
  message?: string
  not_created?: number[]
}

export async function generateInvoice(orderIds: number[]): Promise<ShiprocketGenerateInvoiceResponse> {
  return apiFetch<ShiprocketGenerateInvoiceResponse>('/orders/print/invoice', {
    method: 'POST',
    body: { ids: orderIds },
  })
}
