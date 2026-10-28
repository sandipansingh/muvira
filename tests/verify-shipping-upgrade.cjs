const assert = require('node:assert/strict')
const { spawnSync } = require('node:child_process')
const {
  mkdtempSync,
  mkdirSync,
  copyFileSync,
  readdirSync,
  rmSync,
  readFileSync,
} = require('node:fs')
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

const workdir = process.env.SUPABASE_TEST_WORKDIR
if (!workdir || !process.env.SUPABASE_TEST_SERVICE_ROLE_KEY || !process.env.SUPABASE_TEST_ANON_KEY)
  throw new Error(
    'A dedicated SUPABASE_TEST_WORKDIR and isolated local test credentials are required'
  )
const configPath = resolve(workdir, 'supabase/config.toml')
const config = readFileSync(configPath, 'utf8')
const apiConfig = config.match(/\[api\]([\s\S]*?)(?=\n\[|$)/)?.[1]
const port = apiConfig?.match(/^port\s*=\s*(\d+)/m)?.[1]
if (!port || new URL(process.env.SUPABASE_TEST_URL).port !== port || port === '54321')
  throw new Error(
    'Upgrade verification requires the dedicated non-default stack configured by SUPABASE_TEST_WORKDIR'
  )
const directory = mkdtempSync(join(tmpdir(), 'muvira-shipping-upgrade-'))
const source = resolve('supabase/migrations')
const migrations = readdirSync(source)
  .filter((name) => /^\d{3}_.*\.sql$/.test(name))
  .sort()
mkdirSync(join(directory, 'supabase/migrations'), { recursive: true })
copyFileSync(configPath, join(directory, 'supabase/config.toml'))
for (const name of migrations.filter((name) => Number(name.slice(0, 3)) <= 53))
  copyFileSync(join(source, name), join(directory, 'supabase/migrations', name))
function run(command, args, env = {}) {
  const result = spawnSync(command, args, { stdio: 'inherit', env: { ...process.env, ...env } })
  if (result.error) throw result.error
  assert.equal(result.status, 0, `${command} ${args.join(' ')} failed`)
}
function cli(args) {
  run('pnpm', ['--filter', 'server', 'exec', 'supabase', '--workdir', directory, ...args])
}
function readiness(version) {
  run(process.execPath, ['--test', 'tests/schema-readiness.test.cjs'], {
    SCHEMA_RELEASE_MODE: 'final',
    EXPECTED_SCHEMA_VERSION: String(version),
    EXPECTED_SCHEMA_READY: String(version === 56),
  })
}
async function main() {
  const client = serviceClient(
    process.env.SUPABASE_TEST_URL,
    process.env.SUPABASE_TEST_SERVICE_ROLE_KEY
  )
  const fixtures = []
  try {
    cli(['db', 'reset', '--local', '--no-seed', '--version', '053'])
    readiness(53)
    const paid = await createOrderFixture(client)
    fixtures.push(paid)
    const payment = await createPaymentFixture(client, paid)
    const pending = await createOrderFixture(client, {
      status: 'pending',
      paymentStatus: 'pending',
    })
    fixtures.push(pending)
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
      p_cause: 'Shipping upgrade preservation fixture',
    })
    assert.ifError(operation.error)
    const snapshot = async () => {
      const ids = fixtures.map((fixture) => fixture.orderId)
      const results = await Promise.all([
        client
          .from('orders')
          .select(
            'id,status,payment_status,total_amount_paisa,shiprocket_order_id,shipment_id,awb_code'
          )
          .in('id', ids)
          .order('id'),
        client
          .from('payments')
          .select('id,order_id,status,amount_paisa,currency,razorpay_order_id,razorpay_payment_id')
          .in('order_id', ids)
          .order('id'),
        client
          .from('provider_operations')
          .select(
            'id,order_id,state,provider,operation_type,amount_paisa,currency,provider_target_id'
          )
          .in('order_id', ids)
          .order('id'),
      ])
      results.forEach((result) => assert.ifError(result.error))
      return results.map((result) => result.data)
    }
    const before = await snapshot()
    for (const version of [54, 55, 56]) {
      const name = migrations.find((candidate) => Number(candidate.slice(0, 3)) === version)
      assert.ok(name, `Migration ${version} is required`)
      copyFileSync(join(source, name), join(directory, 'supabase/migrations', name))
      cli(['migration', 'up', '--local'])
      readiness(version)
      assert.deepEqual(
        await snapshot(),
        before,
        `Migration ${version} must preserve money, payment status and provider identities`
      )
    }
    console.log(
      'Shipping upgrade 053→056 preserves existing order, payment and operation snapshots.'
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
