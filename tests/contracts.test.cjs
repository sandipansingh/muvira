const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const { join } = require('node:path')
const test = require('node:test')

const root = join(__dirname, '..')

function read(relativePath) {
  return readFileSync(join(root, relativePath), 'utf8')
}

test('the fabricated payment endpoint and instrument fields stay removed', () => {
  const checkoutRoutes = read('server/src/modules/checkout/routes.ts')
  const checkoutSchema = read('server/src/modules/checkout/schema.ts')
  const checkoutPage = read('client/src/pages/CheckoutPage.tsx')

  assert.doesNotMatch(checkoutRoutes, /pay-custom|payCustom/i)
  assert.doesNotMatch(checkoutSchema, /card_number|\bcvv\b|upi_id|bank_name/i)
  assert.doesNotMatch(checkoutPage, /card_number|\bcvv\b|upi_id|bank_name/i)
  assert.match(checkoutRoutes, /['"]\/create-order['"]/)
})

test('order success is derived from an owned API response', () => {
  const successPage = read('client/src/pages/OrderSuccessPage.tsx')

  assert.match(successPage, /getOrderById\(orderId\)/)
  assert.match(successPage, /paymentStatus\s*!==\s*['"]paid['"]/)
  assert.doesNotMatch(successPage, /Payment Verified & Confirmed/)
})

test('review empty and error states do not substitute fabricated reviews', () => {
  const reviews = read('client/src/components/product/ReviewsSection.tsx')

  assert.match(reviews, /No reviews have been published yet/)
  assert.match(reviews, /Reviews could not be loaded/)
  assert.doesNotMatch(reviews, /mock[-_ ]|TESTIMONIALS/i)
})

test('security migration revokes direct commerce and privileged function access', () => {
  const migration = read('supabase/migrations/026_security_boundary.sql')

  assert.match(migration, /REVOKE\s+UPDATE\s+ON\s+TABLE\s+profiles\s+FROM\s+anon,\s*authenticated/i)
  assert.match(migration, /REVOKE\s+INSERT\s+ON\s+TABLE\s+orders\s+FROM\s+anon,\s*authenticated/i)
  assert.match(
    migration,
    /REVOKE\s+INSERT\s+ON\s+TABLE\s+order_items\s+FROM\s+anon,\s*authenticated/i
  )
  assert.match(migration, /REVOKE\s+ALL\s+ON\s+FUNCTION\s+decrement_stock/i)
  assert.match(migration, /GRANT\s+EXECUTE\s+ON\s+FUNCTION\s+decrement_stock[\s\S]+service_role/i)
})

test('atomic checkout migration protects reservations and provider idempotency', () => {
  const migration = read('supabase/migrations/029_atomic_checkout.sql')

  assert.match(migration, /CREATE TABLE IF NOT EXISTS inventory_reservations/i)
  assert.match(migration, /CREATE TABLE IF NOT EXISTS coupon_redemption_reservations/i)
  assert.match(migration, /CREATE TABLE IF NOT EXISTS outbox_events/i)
  assert.match(migration, /CREATE UNIQUE INDEX IF NOT EXISTS idx_webhook_events_source_event_id/i)
  assert.match(migration, /FOR UPDATE/)
})
