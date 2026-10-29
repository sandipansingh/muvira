const assert = require('node:assert/strict')
const { spawnSync } = require('node:child_process')
const { mkdtempSync, mkdirSync, copyFileSync, readdirSync, rmSync } = require('node:fs')
const { tmpdir } = require('node:os')
const { join, resolve } = require('node:path')
const crypto = require('node:crypto')
require('./helpers/assert-local-test-db.cjs').assertLocalTestDb()
const {
  serviceClient,
  createOrderFixture,
  createPaymentFixture,
  cleanupOrderFixture,
} = require('./helpers/provider-db-fixture.cjs')

if (!process.env.SUPABASE_TEST_SERVICE_ROLE_KEY || !process.env.SUPABASE_TEST_ANON_KEY)
  throw new Error('Isolated local test configuration is required')
const directory = mkdtempSync(join(tmpdir(), 'muvira-upgrade-'))
const source = resolve('supabase/migrations')
const migrations = readdirSync(source)
  .filter((name) => /^\d{3}_.*\.sql$/.test(name))
  .sort()
mkdirSync(join(directory, 'supabase', 'migrations'), { recursive: true })
copyFileSync(
  process.env.SUPABASE_TEST_WORKDIR
    ? resolve(process.env.SUPABASE_TEST_WORKDIR, 'supabase/config.toml')
    : resolve('supabase/config.toml'),
  join(directory, 'supabase', 'config.toml')
)
for (const name of migrations.filter((name) => Number(name.slice(0, 3)) <= 48))
  copyFileSync(join(source, name), join(directory, 'supabase', 'migrations', name))
function run(command, args, env = {}) {
  const result = spawnSync(command, args, { stdio: 'inherit', env: { ...process.env, ...env } })
  if (result.error) throw result.error
  assert.equal(result.status, 0, `${command} ${args.join(' ')} failed`)
}
function cli(args) {
  run('pnpm', ['--filter', 'server', 'exec', 'supabase', '--workdir', directory, ...args])
}
function readiness(version, mode, ready) {
  run(process.execPath, ['--test', 'tests/schema-readiness.test.cjs'], {
    SCHEMA_RELEASE_MODE: mode,
    EXPECTED_SCHEMA_VERSION: String(version),
    EXPECTED_SCHEMA_READY: String(ready),
  })
}

async function main() {
  const client = serviceClient(
    process.env.SUPABASE_TEST_URL,
    process.env.SUPABASE_TEST_SERVICE_ROLE_KEY
  )
  const fixtures = []
  try {
    cli(['db', 'reset', '--local', '--no-seed', '--version', '048'])
    readiness(48, 'compatibility', true)
    readiness(48, 'final', false)
    run(process.execPath, ['--test', 'tests/legacy-watch-compatibility.test.cjs'], {
      SCHEMA_RELEASE_MODE: 'compatibility',
      RUN_LEGACY_WATCH_CHECK: 'true',
    })
    const pending = await createOrderFixture(client, {
      status: 'pending',
      paymentStatus: 'pending',
    })
    fixtures.push(pending)
    assert.ifError(
      (
        await client
          .from('orders')
          .update({ shipping_amount_paisa: 500, total_amount_paisa: 10500 })
          .eq('id', pending.orderId)
      ).error
    )
    await createPaymentFixture(
      client,
      { ...pending, amountPaisa: 10500 },
      { status: 'created', razorpayPaymentId: null }
    )
    const paid = await createOrderFixture(client)
    fixtures.push(paid)
    const payment = await createPaymentFixture(client, paid)
    const operation = await client.rpc('prepare_provider_operation', {
      p_provider: 'razorpay',
      p_operation_type: 'partial_refund',
      p_business_key: crypto.randomUUID(),
      p_order_id: paid.orderId,
      p_payment_id: payment.paymentId,
      p_provider_target_type: 'payment',
      p_provider_target_id: payment.razorpayPaymentId,
      p_amount_paisa: 2500,
      p_currency: 'INR',
      p_request_hash: 'd'.repeat(64),
      p_cause: 'Upgrade snapshot',
    })
    assert.ifError(operation.error)
    const snapshot = async () => {
      const ids = fixtures.map((f) => f.orderId)
      const results = await Promise.all([
        client
          .from('orders')
          .select('id,shipping_amount_paisa,total_amount_paisa,payment_status')
          .in('id', ids)
          .order('id'),
        client.from('payments').select('*').in('order_id', ids).order('id'),
        client
          .from('provider_operations')
          .select(
            'id,provider,operation_type,business_key,order_id,payment_id,provider_target_type,provider_target_id,idempotency_key,amount_paisa,currency,request_hash,state,dispatch_attempts,local_applied_at,provider_operation_id'
          )
          .in('order_id', ids)
          .order('id'),
      ])
      results.forEach((result) => assert.ifError(result.error))
      return results.map((result) => result.data)
    }
    const before = await snapshot()
    for (const version of [49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60]) {
      const name = migrations.find((name) => Number(name.slice(0, 3)) === version)
      copyFileSync(join(source, name), join(directory, 'supabase', 'migrations', name))
      cli(['migration', 'up', '--local'])
      readiness(version, 'compatibility', true)
      readiness(version, 'final', version >= 60)
      if (version >= 60) {
        run(process.execPath, [
          '--test',
          '--test-name-pattern=HTTP endpoint',
          'tests/admin-analytics-integration.test.cjs',
        ])
      }
      assert.deepEqual(
        await snapshot(),
        before,
        `Migration ${version} must preserve existing monetary records and provider identities`
      )
      if (version === 60) {
        run(process.execPath, [
          '--test',
          '--test-concurrency=1',
          'tests/admin-analytics-integration.test.cjs',
          'tests/retained-checkout-integration.test.cjs',
          'tests/fencing-integration.test.cjs',
        ])
      }
    }
    for (const fixture of fixtures) await cleanupOrderFixture(client, fixture)
    fixtures.length = 0
    run(
      process.execPath,
      [
        '--test',
        '--test-concurrency=1',
        'tests/api-integration.test.cjs',
        'tests/cart-transfer-integration.test.cjs',
        'tests/refund-worker-integration.test.cjs',
      ],
      { SCHEMA_RELEASE_MODE: 'compatibility' }
    )
    console.log(
      'Upgrade 048–060, intermediate contracts, monetary preservation, and compatibility rollback API passed.'
    )
  } finally {
    for (const fixture of fixtures) await cleanupOrderFixture(client, fixture)
    rmSync(directory, { recursive: true, force: true })
  }
}
main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
