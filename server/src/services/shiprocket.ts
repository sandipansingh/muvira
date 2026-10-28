import { env } from '../config/env'
import { logger } from '../lib/logger'
import {
  recordShiprocketCall,
  recordShiprocketCallFailed,
  recordShiprocketCallRetried,
  recordShiprocketCallTimedOut,
} from './metricsCollector'
import {
  canMakeShiprocketCall,
  reportShiprocketSuccess,
  reportShiprocketFailure,
} from './circuitBreaker'

const SHIPROCKET_BASE = 'https://apiv2.shiprocket.in/v1/external'
const DEFAULT_TIMEOUT_MS = 15_000
const DEFAULT_MAX_RETRIES = 3
const MAX_REQUESTS_PER_SEC = 10

// --- Token Bucket Rate Limiter ---

interface TokenBucket {
  tokens: number
  lastRefill: number
}

const tokenBucket: TokenBucket = { tokens: MAX_REQUESTS_PER_SEC, lastRefill: Date.now() }

async function acquireToken(): Promise<void> {
  while (true) {
    const now = Date.now()
    tokenBucket.tokens = Math.min(
      MAX_REQUESTS_PER_SEC,
      tokenBucket.tokens + ((now - tokenBucket.lastRefill) / 1000) * MAX_REQUESTS_PER_SEC
    )
    tokenBucket.lastRefill = now
    if (tokenBucket.tokens >= 1) {
      tokenBucket.tokens -= 1
      return
    }
    await new Promise((resolve) =>
      setTimeout(resolve, Math.ceil(((1 - tokenBucket.tokens) / MAX_REQUESTS_PER_SEC) * 1000))
    )
  }
}

// --- Error Classification ---

export interface ShiprocketError extends Error {
  type:
    | 'RATE_LIMITED'
    | 'SERVER_ERROR'
    | 'AUTH_EXPIRED'
    | 'ALREADY_DONE'
    | 'BAD_REQUEST'
    | 'TIMEOUT'
    | 'NETWORK'
    | 'UNKNOWN'
  statusCode?: number
  retryable: boolean
  retryAfterMs?: number
  shouldRefreshToken?: boolean
}

function classifyError(
  status: number,
  body: string,
  isTimeout: boolean,
  isNetworkError: boolean
): ShiprocketError {
  const err = new Error() as ShiprocketError
  err.type = 'UNKNOWN'
  err.retryable = false

  if (isTimeout) {
    err.type = 'TIMEOUT'
    err.retryable = true
    err.retryAfterMs = 1000
    err.message = 'Shiprocket request timed out'
    return err
  }

  if (isNetworkError) {
    err.type = 'NETWORK'
    err.retryable = true
    err.retryAfterMs = 2000
    err.message = 'Shiprocket network error'
    return err
  }

  err.statusCode = status

  if (status === 429) {
    err.type = 'RATE_LIMITED'
    err.retryable = true
    err.retryAfterMs = 60_000
    err.message = 'Shiprocket rate limited (429)'
    return err
  }

  if (status >= 500) {
    err.type = 'SERVER_ERROR'
    err.retryable = true
    err.retryAfterMs = 5000
    err.message = `Shiprocket server error (${status})`
    return err
  }

  if (status === 401) {
    err.type = 'AUTH_EXPIRED'
    err.retryable = true
    err.shouldRefreshToken = true
    err.message = 'Shiprocket auth expired (401)'
    return err
  }

  if (
    status === 400 &&
    (body.toLowerCase().includes('already') || body.toLowerCase().includes('generated'))
  ) {
    err.type = 'ALREADY_DONE'
    err.retryable = false
    err.message = 'Shiprocket operation already exists (400)'
    return err
  }

  if (status === 400 || status === 422) {
    err.type = 'BAD_REQUEST'
    err.retryable = false
    err.message = `Shiprocket rejected request (${status})`
    return err
  }

  if (status === 404) {
    err.type = 'BAD_REQUEST'
    err.retryable = false
    err.message = 'Shiprocket not found (404)'
    return err
  }

  err.message = `Shiprocket API error (${status})`
  return err
}

// --- Token Management ---

let cachedToken: string | null = null
let tokenExpiresAt: number = 0
let refreshingToken: Promise<string> | null = null

async function getToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiresAt) return cachedToken
  if (refreshingToken) return refreshingToken
  refreshingToken = refreshToken().finally(() => {
    refreshingToken = null
  })
  return refreshingToken
}

async function refreshToken(): Promise<string> {
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
    signal: AbortSignal.timeout(10_000),
  })

  if (!res.ok) {
    throw new Error(`Shiprocket auth failed (${res.status})`)
  }

  const data = (await res.json()) as { token?: string }
  if (!data.token) throw new Error('Shiprocket auth: no token in response')

  cachedToken = data.token
  tokenExpiresAt = now + 23 * 60 * 60 * 1000

  return cachedToken
}

function invalidateToken(): void {
  cachedToken = null
  tokenExpiresAt = 0
  logger.info('Shiprocket: token invalidated')
}

// --- Core API Client with Resilience ---

async function apiFetch<T>(
  path: string,
  options: {
    method?: string
    body?: unknown
    timeout?: number
    maxRetries?: number
    policy?: 'retry_safe_read' | 'at_most_once_mutation'
    expectedStatus?: number
  } = {}
): Promise<T> {
  const safeRead =
    options.policy === 'retry_safe_read' ||
    (!options.policy && (!options.method || options.method === 'GET'))
  const maxRetries = safeRead ? (options.maxRetries ?? DEFAULT_MAX_RETRIES) : 0
  const timeout = options.timeout ?? DEFAULT_TIMEOUT_MS
  const deadline = Date.now() + Math.min(55_000, timeout * (maxRetries + 1))
  let lastError: ShiprocketError | null = null
  const callStart = Date.now()

  // Circuit breaker: if Shiprocket is down, fail fast
  if (!canMakeShiprocketCall()) {
    const breakerErr = new Error('Shiprocket API circuit breaker is open') as ShiprocketError
    breakerErr.type = 'SERVER_ERROR'
    breakerErr.retryable = true
    breakerErr.retryAfterMs = 60_000
    throw breakerErr
  }

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Rate limit gate
      await acquireToken()

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
        signal: AbortSignal.timeout(Math.max(1, Math.min(timeout, deadline - Date.now()))),
      })

      // 401: token may have expired before our TTL. Invalidate and retry once.
      if (res.status === 401) {
        if (cachedToken === token) invalidateToken()
      }
      if (res.status === 401 && attempt < maxRetries) {
        lastError = classifyError(401, '', false, false)
        continue
      }

      if (!res.ok) {
        const text = await res.text().catch(() => '')
        const error = classifyError(res.status, text, false, false)
        const retryAfter = res.headers.get('retry-after')
        if (retryAfter) {
          const seconds = Number(retryAfter)
          error.retryAfterMs = Number.isFinite(seconds)
            ? Math.max(0, seconds * 1000)
            : Math.max(0, Date.parse(retryAfter) - Date.now())
        }
        throw error
      }
      if (options.expectedStatus !== undefined && res.status !== options.expectedStatus) {
        throw new Error('Shiprocket returned an unconfirmed mutation response')
      }

      const contentType = res.headers.get('content-type') ?? ''
      if (
        contentType.includes('application/pdf') ||
        contentType.includes('application/octet-stream')
      ) {
        recordShiprocketCall(Date.now() - callStart)
        reportShiprocketSuccess()
        return (await res.arrayBuffer()) as unknown as T
      }

      recordShiprocketCall(Date.now() - callStart)
      reportShiprocketSuccess()
      const body = await res.text()
      return (body.trim() ? JSON.parse(body) : {}) as T
    } catch (err) {
      if (
        err instanceof DOMException &&
        (err.name === 'AbortError' || err.name === 'TimeoutError')
      ) {
        lastError = classifyError(0, '', true, false)
        recordShiprocketCallTimedOut()
      } else if (
        err instanceof TypeError &&
        (err.message.includes('fetch') || err.message.includes('network'))
      ) {
        lastError = classifyError(0, '', false, true)
        recordShiprocketCallFailed()
      } else if ((err as ShiprocketError).type) {
        lastError = err as ShiprocketError
        if (!lastError.retryable) recordShiprocketCallFailed()
      } else {
        const message = err instanceof Error ? err.message : String(err)
        lastError = new Error(message) as ShiprocketError
        lastError.type = 'UNKNOWN'
        lastError.retryable = true
        lastError.retryAfterMs = 1000
      }

      if (!lastError.retryable || attempt >= maxRetries) break

      recordShiprocketCallRetried()
      const delay = lastError.retryAfterMs ?? 1000 * 2 ** attempt
      if (!Number.isFinite(delay) || Date.now() + delay >= deadline) break
      logger.warn(
        { path, attempt: attempt + 1, maxRetries, delay, type: lastError.type },
        `Shiprocket: retrying after ${delay}ms`
      )
      await new Promise((r) => setTimeout(r, delay))
    }
  }

  recordShiprocketCallFailed()
  reportShiprocketFailure()
  throw lastError ?? new Error('Shiprocket API error: max retries exceeded')
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
  customer_gstin?: string
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
  is_return?: number // 0 = normal order, 1 = return order
  status?: string // 'reassign' to change courier (once per 24h)
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
  response: {
    status: string
    pickup_scheduled_date: string
    pickup_token_number: string
  }
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
  weight_grams: number
  cod: boolean
  length_cm?: number
  breadth_cm?: number
  height_cm?: number
  declared_value_paisa?: number
}

export interface ShiprocketServiceabilityResponse {
  data: {
    available_courier: Array<{
      courier_name: string
      courier_id: number
      rate_paisa: number
      estimated_delivery_days: number | null
      cod: boolean
    }>
    recommended_courier?: {
      courier_name: string
      courier_id: number
      rate_paisa: number
      estimated_delivery_days: number | null
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
  currency: string
  merchant_order_id: string
  total_paisa: number | null
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

export function normalizePickupLocations(value: unknown): ShiprocketPickupLocation[] {
  if (!Array.isArray(value)) throw new Error('Shiprocket pickup locations response is invalid')
  return value.map((entry: unknown) => {
    if (!entry || typeof entry !== 'object')
      throw new Error('Shiprocket pickup location is invalid')
    const row = entry as Record<string, unknown>
    const pickupId = Number(row['pickup_id'] ?? row['id'])
    const pickupLocation = row['pickup_location']
    const pincode = String(row['pincode'] ?? row['pin_code'] ?? '')
    if (
      !Number.isInteger(pickupId) ||
      pickupId <= 0 ||
      typeof pickupLocation !== 'string' ||
      !pickupLocation.trim() ||
      !/^\d{6}$/.test(pincode)
    ) {
      throw new Error(
        'Shiprocket pickup location is missing its registered name, identifier or pincode'
      )
    }
    return {
      pickup_id: pickupId,
      pickup_location: pickupLocation,
      pincode,
      address: String(row['address'] ?? ''),
      city: String(row['city'] ?? ''),
      state: String(row['state'] ?? ''),
      phone: String(row['phone'] ?? ''),
      name: String(row['name'] ?? ''),
    }
  })
}

export async function getPickupLocations(): Promise<ShiprocketPickupLocation[]> {
  const data = await apiFetch<{ data?: { shipping_address?: unknown } }>('/settings/company/pickup')
  return normalizePickupLocations(data.data?.shipping_address)
}

//
// 2. Courier Serviceability
//

export function courierRatePaisa(value: unknown): number {
  if (value === null || value === undefined || value === '')
    throw new Error('Shiprocket courier price is missing')
  const rate = Number(value)
  if (!Number.isFinite(rate) || rate < 0 || !Number.isSafeInteger(Math.round(rate * 100)))
    throw new Error('Shiprocket courier price is invalid')
  return Math.round(rate * 100)
}

export async function checkServiceability(
  input: ShiprocketServiceabilityInput
): Promise<ShiprocketServiceabilityResponse['data']> {
  const params = new URLSearchParams({
    pickup_postcode: input.pickup_pincode,
    delivery_postcode: input.delivery_pincode,
    weight: String(input.weight_grams / 1000),
    cod: input.cod ? '1' : '0',
  })
  for (const [key, value] of Object.entries({
    length: input.length_cm,
    breadth: input.breadth_cm,
    height: input.height_cm,
    declared_value:
      input.declared_value_paisa === undefined ? undefined : input.declared_value_paisa / 100,
  })) {
    if (value !== undefined) params.set(key, String(value))
  }
  const result = await apiFetch<Record<string, unknown>>(
    `/courier/serviceability/?${params.toString()}`
  )
  const raw = result as Record<string, unknown>
  const str = (v: unknown, fallback = ''): string => (typeof v === 'string' ? v : fallback)
  const num = (v: unknown, fallback = 0): number =>
    Number.isFinite(Number(v)) ? Number(v) : fallback
  const estimate = (v: unknown): number | null => {
    if (v === null || v === undefined || v === '') return null
    const days = Number(v)
    return Number.isFinite(days) && days > 0 ? days : null
  }
  const bol = (v: unknown): boolean => v === true || v === 1 || v === '1'

  function mapCourierList(
    companies: Array<Record<string, unknown>>
  ): ShiprocketServiceabilityResponse['data']['available_courier'] {
    return companies.map((c) => ({
      courier_name: str(c['courier_name']) || str(c['name']),
      courier_id: num(c['courier_company_id']) || num(c['courier_id']) || num(c['id']),
      rate_paisa: courierRatePaisa(c['rate'] ?? c['freight_charge']),
      estimated_delivery_days: estimate(c['estimated_delivery_days'] ?? c['edd']),
      cod: bol(c['cod']) || bol(c['is_cod_available']),
    }))
  }

  const topData = raw['data'] as Record<string, unknown> | undefined

  if (topData?.['available_courier_companies']) {
    return {
      available_courier: mapCourierList(
        topData['available_courier_companies'] as Array<Record<string, unknown>>
      ),
    }
  }
  if (topData?.['available_courier']) {
    return {
      available_courier: mapCourierList(
        topData['available_courier'] as Array<Record<string, unknown>>
      ),
    }
  }
  if (raw['available_courier_companies']) {
    return {
      available_courier: mapCourierList(
        raw['available_courier_companies'] as Array<Record<string, unknown>>
      ),
    }
  }
  if (raw['available_courier']) {
    return {
      available_courier: mapCourierList(raw['available_courier'] as Array<Record<string, unknown>>),
    }
  }
  if (raw['recommended_courier_company_id']) {
    const rec = {
      courier_name: str(raw['recommended_courier_company_name']),
      courier_id: num(raw['recommended_courier_company_id']),
      rate_paisa: courierRatePaisa(raw['recommended_rate']),
      estimated_delivery_days: estimate(raw['recommended_edd']),
      cod: false,
    }
    return { available_courier: [rec], recommended_courier: rec }
  }
  if (Array.isArray(raw['data'])) {
    return { available_courier: mapCourierList(raw['data'] as Array<Record<string, unknown>>) }
  }
  throw new Error('Shiprocket serviceability response is invalid')
}

//
// 3. Create Order
//

export async function createOrder(
  input: ShiprocketOrderInput
): Promise<ShiprocketCreateOrderResponse> {
  const result = await apiFetch<Record<string, unknown>>('/orders/create/adhoc', {
    method: 'POST',
    body: input,
  })
  const response = (result['data'] ?? result) as Record<string, unknown>
  const orderId = Number(response['shiprocket_order_id'] ?? response['order_id'])
  const shipmentId = Number(response['shipment_id'])
  if (
    !Number.isSafeInteger(orderId) ||
    orderId <= 0 ||
    !Number.isSafeInteger(shipmentId) ||
    shipmentId <= 0 ||
    Number(response['status_code']) !== 1 ||
    String(response['status']).toUpperCase() !== 'NEW'
  ) {
    throw new Error(
      'Shiprocket did not confirm order creation. Check the provider order before retrying.'
    )
  }
  return {
    ...response,
    order_id: orderId,
    shipment_id: shipmentId,
  } as unknown as ShiprocketCreateOrderResponse
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
  const result = await apiFetch<
    ShiprocketAssignAwbResponse | { data: ShiprocketAssignAwbResponse }
  >('/courier/assign/awb', {
    method: 'POST',
    body: input,
  })
  // Shiprocket sometimes wraps the entire response in a top-level 'data' key
  const raw = result as unknown as Record<string, unknown>
  if (raw['data'] && raw['data'] !== null && typeof raw['data'] === 'object' && !raw['response']) {
    const normalized = raw['data'] as unknown as ShiprocketAssignAwbResponse
    if (Number(normalized.awb_assign_status) !== 1)
      throw new Error('Shiprocket did not confirm AWB assignment')
    return normalized
  }
  if (Number((result as ShiprocketAssignAwbResponse).awb_assign_status) !== 1)
    throw new Error('Shiprocket did not confirm AWB assignment')
  return result as ShiprocketAssignAwbResponse
}

//
// 6. Schedule Pickup
//

export async function schedulePickup(
  input: ShiprocketPickupInput
): Promise<ShiprocketPickupResponse> {
  const result = await apiFetch<Record<string, unknown>>('/courier/generate/pickup', {
    method: 'POST',
    body: input,
  })
  const raw = Array.isArray(result['response']) ? result['response'][0] : result['response']
  const confirmed = raw as Record<string, unknown> | undefined
  if (
    Number(result['pickup_status']) !== 1 ||
    Number(confirmed?.['status']) !== 3 ||
    typeof confirmed?.['pickup_scheduled_date'] !== 'string' ||
    !confirmed['pickup_scheduled_date'].trim()
  ) {
    throw new Error(
      'Shiprocket did not confirm pickup scheduling. Check shipment details before retrying.'
    )
  }
  return {
    pickup_status: 1,
    response: {
      status: 'scheduled',
      pickup_scheduled_date: confirmed['pickup_scheduled_date'],
      pickup_token_number: String(confirmed['pickup_token_number'] ?? ''),
    },
  }
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

export function assertDocumentResult(value: unknown, kind: 'label' | 'manifest'): string {
  if (!value || typeof value !== 'object') throw new Error(`Shiprocket ${kind} response is invalid`)
  const result = value as Record<string, unknown>
  const success = kind === 'label' ? result['label_created'] === 1 : result['status'] === 1
  const url = result[kind === 'label' ? 'label_url' : 'manifest_url']
  if (!success || typeof url !== 'string')
    throw new Error(`Shiprocket did not confirm ${kind} generation`)
  const parsed = new URL(url)
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password)
    throw new Error(`Shiprocket ${kind} URL is invalid`)
  return url
}

//
// 7. Generate Label
//

export async function generateLabel(shipmentId: number): Promise<ShiprocketGenerateLabelResponse> {
  const result = await apiFetch<ShiprocketGenerateLabelResponse>('/courier/generate/label', {
    method: 'POST',
    body: { shipment_id: [shipmentId] },
  })
  assertDocumentResult(result, 'label')
  return result
}

//
// 8. Generate Manifest
//

export async function generateManifest(
  shipmentId?: number
): Promise<ShiprocketGenerateManifestResponse> {
  const result = await apiFetch<ShiprocketGenerateManifestResponse>('/manifests/generate', {
    method: 'POST',
    body: shipmentId != null ? { shipment_id: [shipmentId] } : {},
  })
  assertDocumentResult(result, 'manifest')
  return result
}

//
// 9. Get Order Details
//

export async function getOrderDetails(orderId: number): Promise<ShiprocketGetOrderResponse> {
  const raw = await apiFetch<unknown>(`/orders/show/${orderId}`)
  return normalizeOrderDetails(raw)
}

export function normalizeOrderDetails(value: unknown): ShiprocketGetOrderResponse {
  if (!value || typeof value !== 'object') throw new Error('Shiprocket order details are invalid')
  const wrapper = value as Record<string, unknown>
  const order = (wrapper['data'] ?? wrapper) as Record<string, unknown>
  const shipments = order['shipments']
  const shipment = (Array.isArray(shipments) ? shipments[0] : shipments) as
    | Record<string, unknown>
    | undefined
  const orderId = Number(order['id'] ?? order['order_id'])
  if (!Number.isSafeInteger(orderId) || orderId <= 0)
    throw new Error('Shiprocket order identity is invalid')
  return {
    ...order,
    order_id: orderId,
    merchant_order_id: String(order['channel_order_id'] ?? order['merchant_order_id'] ?? ''),
    currency: String(order['currency'] ?? ''),
    total_paisa: order['total'] === undefined ? null : courierRatePaisa(order['total']),
    shipment_id: Number(shipment?.['id'] ?? order['shipment_id']),
    awb_code: String(shipment?.['awb'] ?? order['awb_code'] ?? ''),
    courier_name: String(shipment?.['courier'] ?? order['courier_name'] ?? ''),
    pickup_scheduled_date:
      shipment?.['pickup_scheduled_date'] ?? order['pickup_scheduled_date'] ?? null,
    status: String(order['status'] ?? ''),
    shipment_status: String(shipment?.['status'] ?? order['shipment_status'] ?? ''),
  } as ShiprocketGetOrderResponse
}

export async function findOrdersByMerchantReference(
  reference: string
): Promise<ShiprocketGetOrderResponse[]> {
  const result = await apiFetch<{ data?: unknown[] }>(
    `/orders?search=${encodeURIComponent(reference)}&per_page=100`
  )
  if (!Array.isArray(result.data)) throw new Error('Shiprocket order search is invalid')
  return result.data
    .map(normalizeOrderDetails)
    .filter((order) => order.merchant_order_id === reference)
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
  const result: Record<string, { tracking_data: ShiprocketTrackData }> = {}
  const unique = [...new Set(awbs)]
  for (let index = 0; index < unique.length; index += 50) {
    Object.assign(
      result,
      await apiFetch('/courier/track/awbs', {
        method: 'POST',
        body: { awbs: unique.slice(index, index + 50) },
        policy: 'retry_safe_read',
      })
    )
  }
  return result
}

//
// 12. Track by Order ID
//

export async function trackByOrder(
  orderId: number
): Promise<{ tracking_data: ShiprocketTrackData }> {
  return apiFetch<{ tracking_data: ShiprocketTrackData }>(`/courier/track?order_id=${orderId}`)
}

//
// 13. Track by Shipment ID
//

export async function trackByShipment(
  shipmentId: number
): Promise<{ tracking_data: ShiprocketTrackData }> {
  return apiFetch<{ tracking_data: ShiprocketTrackData }>(`/courier/track/shipment/${shipmentId}`)
}

//
// 14. Cancel Order
//

export async function cancelOrder(
  input: ShiprocketCancelOrderInput
): Promise<Record<string, unknown>> {
  return apiFetch<Record<string, unknown>>('/orders/cancel', {
    method: 'POST',
    body: input,
    policy: 'at_most_once_mutation',
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
    policy: 'at_most_once_mutation',
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

export async function generateInvoice(
  orderIds: number[]
): Promise<ShiprocketGenerateInvoiceResponse> {
  return apiFetch<ShiprocketGenerateInvoiceResponse>('/orders/print/invoice', {
    method: 'POST',
    body: { ids: orderIds },
  })
}

//
// 18. Create Return Order
//

export interface ShiprocketReturnOrderInput {
  order_id: string
  order_date: string
  pickup_customer_name: string
  pickup_last_name: string
  pickup_address: string
  pickup_city: string
  pickup_pincode: string
  pickup_state: string
  pickup_country: string
  pickup_email: string
  pickup_phone: string
  pickup_isd_code?: string
  shipping_customer_name: string
  shipping_last_name: string
  shipping_address: string
  shipping_city: string
  shipping_pincode: string
  shipping_state: string
  shipping_country: string
  shipping_email: string
  shipping_phone: string
  shipping_isd_code?: string
  order_items: Array<{
    name: string
    sku: string
    units: number
    selling_price: number
  }>
  payment_method: 'Prepaid' | 'COD'
  total_discount?: number
  sub_total: number
  length: number
  breadth: number
  height: number
  weight: number
}

export interface ShiprocketReturnOrderResponse {
  order_id: number
  shipment_id: number
  status: string
}

export async function createReturnOrder(
  input: ShiprocketReturnOrderInput
): Promise<ShiprocketReturnOrderResponse> {
  return apiFetch<ShiprocketReturnOrderResponse>('/orders/create/return', {
    method: 'POST',
    body: input,
  })
}

export interface ShiprocketNdrEpisode {
  shipment_id: string
  awb_code: string
  episode_id: string
  reason: string
  attempts: number
  raised_at: string
}

export async function getNdrDetails(awb: string): Promise<ShiprocketNdrEpisode[]> {
  const result = await apiFetch<{ data?: Array<Record<string, unknown>> }>(
    `/ndr/${encodeURIComponent(awb)}`
  )
  if (!Array.isArray(result.data)) throw new Error('Shiprocket NDR response is invalid')
  return result.data
    .filter((row) => String(row['awb_code']) === awb)
    .map((row) => {
      const raisedAt = String(row['ndr_raised_at'] ?? '')
      const attempts = Number(row['attempts'])
      if (!raisedAt || !Number.isSafeInteger(attempts) || attempts < 1 || !row['shipment_id'])
        throw new Error('Shiprocket NDR episode is invalid')
      return {
        shipment_id: String(row['shipment_id']),
        awb_code: awb,
        episode_id: `${row['id']}:${attempts}:${raisedAt}`,
        reason: String(row['reason'] ?? ''),
        attempts,
        raised_at: raisedAt,
      }
    })
}

export async function submitNdrAction(
  awb: string,
  input: { action: 're-attempt' | 'return'; comments: string; deferred_date?: string }
): Promise<{ accepted: true }> {
  const result = await apiFetch<{ status?: string }>(`/ndr/${encodeURIComponent(awb)}/action`, {
    method: 'POST',
    body: input,
    policy: 'at_most_once_mutation',
    expectedStatus: 202,
  })
  if (
    !['data updated sucessfully', 'data updated successfully'].includes(
      result.status?.trim().toLowerCase() ?? ''
    )
  )
    throw new Error('Shiprocket did not confirm NDR request acceptance')
  return { accepted: true }
}
