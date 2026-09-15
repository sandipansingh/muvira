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
  const confirmationPolicy = read('client/src/lib/utils/orderConfirmation.ts')

  assert.match(successPage, /getOrderById\(orderId\)/)
  assert.match(successPage, /isVerifiedPaidOrder\(response\.data\)/)
  assert.match(confirmationPolicy, /paymentStatus\s*===\s*['"]paid['"]/)
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

test('readiness and database routes are gated by the runtime schema contract', () => {
  const healthRoutes = read('server/src/modules/health/routes.ts')
  const app = read('server/src/app.ts')
  const workerStartup = read('server/src/services/workerStartup.ts')

  assert.match(healthRoutes, /['"]\/ready['"]/)
  assert.match(healthRoutes, /database_contract/)
  assert.match(healthRoutes, /getRuntimeSchemaStatus/)
  assert.match(app, /app\.use\(['"]\/api\/health['"], healthRouter\)[\s\S]+requireRuntimeSchema/)
  assert.match(workerStartup, /if \(!status\.ready\)/)
  assert.match(workerStartup, /startWorkers\(\)/)
  assert.doesNotMatch(healthRoutes, /shiprocketAuthCheck|getToken/)
})

test('migration 038 defines a service-role-only complete runtime contract', () => {
  const migration = read('supabase/migrations/038_runtime_schema_contract.sql')

  assert.match(migration, /contract_version['"],\s*38/i)
  assert.match(migration, /migration_version/i)
  assert.match(migration, /missing_relations/i)
  assert.match(migration, /missing_columns/i)
  assert.match(migration, /missing_functions/i)
  assert.match(migration, /invalid_function_grants/i)
  assert.match(migration, /invalid_rls_relations/i)
  assert.match(migration, /invalid_storage_capabilities/i)
  assert.match(
    migration,
    /REVOKE ALL ON FUNCTION public\.get_runtime_schema_status\(\) FROM PUBLIC, anon, authenticated/i
  )
  assert.match(
    migration,
    /GRANT EXECUTE ON FUNCTION public\.get_runtime_schema_status\(\) TO service_role/i
  )
})

test('production migration pushes require the expected runtime and linked project refs', () => {
  const packageJson = JSON.parse(read('package.json'))
  const guard = read('scripts/push-supabase-migrations.sh')

  assert.equal(packageJson.scripts['db:migrate'], 'bash scripts/push-supabase-migrations.sh')
  assert.match(guard, /EXPECTED_PROJECT_REF='mmpsquheiibatsjficwm'/)
  assert.match(guard, /runtime_host.*EXPECTED_PROJECT_REF\.supabase\.co/)
  assert.match(guard, /linked_ref.*EXPECTED_PROJECT_REF/)
  assert.match(guard, /exec npx supabase db push --workdir \.\. --linked/)
})
