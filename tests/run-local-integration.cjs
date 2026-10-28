const { spawnSync } = require('node:child_process')

require('./helpers/assert-local-test-db.cjs').assertLocalTestDb()

const required = ['SUPABASE_TEST_URL', 'SUPABASE_TEST_ANON_KEY', 'SUPABASE_TEST_SERVICE_ROLE_KEY']
if (required.some((name) => !process.env[name]?.trim())) {
  console.error(
    'Integration tests require isolated local Supabase: set SUPABASE_TEST_URL to a loopback HTTP URL, both test keys, and SUPABASE_TEST_ISOLATED_LOCAL=true. Never use hosted or production credentials.'
  )
  process.exit(1)
}
const suites = [
  'database-security',
  'api-integration',
  'fencing-integration',
  'provider-operations-integration',
  'provider-refunds',
  'provider-cancellations',
  'retained-checkout-integration',
  'custom-checkout-integration',
  'shipping-integration',
  'durable-shipping-integration',
  'cart-transfer-integration',
  'refund-worker-integration',
  'reporting-integration',
  'admin-analytics-integration',
  'catalog-media-integration',
]
const result = spawnSync(
  process.execPath,
  ['--test', '--test-concurrency=1', ...suites.map((name) => `tests/${name}.test.cjs`)],
  {
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'test' },
  }
)
if (result.error) console.error(result.error.message)
process.exit(result.status ?? 1)
