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

test('migration 039 defines leased payment recovery and advances runtime readiness', () => {
  const migration = read('supabase/migrations/039_payment_recovery.sql')

  assert.match(migration, /contract_version['"],\s*39/i)
  assert.match(migration, /FOR UPDATE SKIP LOCKED/i)
  assert.match(migration, /CREATE OR REPLACE FUNCTION claim_retry_jobs/i)
  assert.match(migration, /CREATE OR REPLACE FUNCTION complete_retry_job/i)
  assert.match(migration, /CREATE OR REPLACE FUNCTION fail_retry_job/i)
  assert.match(migration, /CREATE OR REPLACE FUNCTION requeue_retry_job/i)
  assert.match(migration, /CREATE OR REPLACE FUNCTION record_payment_reconciliation/i)
  assert.match(migration, /razorpay_webhook/i)
  assert.match(migration, /migration_version/i)
  assert.match(migration, /missing_columns/i)
  assert.match(migration, /missing_functions/i)
  assert.match(
    migration,
    /REVOKE ALL ON FUNCTION public\.get_runtime_schema_status\(\)\s+FROM PUBLIC, anon, authenticated/i
  )
  assert.match(
    migration,
    /GRANT EXECUTE ON FUNCTION public\.get_runtime_schema_status\(\) TO service_role/i
  )
})

test('Razorpay recovery producers and retry-safe failure UI remain connected', () => {
  const payments = read('server/src/modules/payments/service.ts')
  const checkout = read('server/src/modules/checkout/service.ts')
  const worker = read('server/src/services/retryWorker.ts')
  const failurePage = read('client/src/pages/OrderFailurePage.tsx')

  assert.match(payments, /record_payment_reconciliation/)
  assert.match(payments, /enqueue_retry_job/)
  assert.match(payments, /processStoredRazorpayWebhook/)
  assert.match(payments, /payments\.fetch[\s\S]+orders\.fetch/)
  assert.match(checkout, /recordPaymentReconciliation[\s\S]+releaseFailedCheckout/)
  assert.match(worker, /claim_retry_jobs/)
  assert.match(worker, /complete_retry_job/)
  assert.match(worker, /fail_retry_job/)
  assert.match(failurePage, /paymentStatus === ['"]released['"]/)
  assert.doesNotMatch(failurePage, /You can safely retry/)
})

test('Shiprocket raw statuses and production webhook readiness use one contract', () => {
  const migration = read('supabase/migrations/040_shiprocket_raw_status.sql')
  const env = read('server/src/config/env.ts')
  const service = read('server/src/modules/shiprocket/service.ts')

  assert.match(migration, /DROP CONSTRAINT IF EXISTS orders_shiprocket_status_check/)
  assert.match(migration, /ADD CONSTRAINT orders_shiprocket_status_raw/)
  assert.match(migration, /CHAR_LENGTH\(shiprocket_status\) BETWEEN 1 AND 120/i)
  assert.match(migration, /contract_version['"],\s*40/i)
  assert.match(
    env,
    /NODE_ENV === ['"]production['"][\s\S]+SHIPROCKET_WEBHOOK_ENABLED !== ['"]true['"]/
  )
  assert.match(service, /shiprocket_status: event\.currentStatus/)
  assert.match(service, /mapShiprocketStatusToOrderStatus\(event\.currentStatus\)/)
})

test('authenticated routes require an API profile and safe return path', () => {
  const context = read('client/src/context/AuthContext.tsx')
  const redirect = read('client/src/lib/authRedirect.ts')
  const app = read('client/src/App.tsx')

  assert.doesNotMatch(context, /profileFromSession/)
  assert.match(context, /profileError/)
  assert.match(context, /retryProfile/)
  assert.match(redirect, /safeReturnPath/)
  assert.match(redirect, /decoded\.startsWith\(['"]\/\/['"]\)/)
  assert.match(app, /AuthGuard/)
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
