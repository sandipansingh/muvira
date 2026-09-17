const assert = require('node:assert/strict')
const crypto = require('node:crypto')
const test = require('node:test')
const { createClient } = require('../server/node_modules/@supabase/supabase-js')

const apiUrl = process.env.SUPABASE_TEST_URL
const anonKey = process.env.SUPABASE_TEST_ANON_KEY
const serviceRoleKey = process.env.SUPABASE_TEST_SERVICE_ROLE_KEY
const shouldRun = Boolean(apiUrl && anonKey && serviceRoleKey)

const applicationRelations = [
  'addresses',
  'cart_items',
  'categories',
  'coupon_redemption_reservations',
  'coupons',
  'inventory_reservations',
  'invoice_records',
  'low_stock_products',
  'notification_deliveries',
  'notification_logs',
  'notification_preferences',
  'operation_leases',
  'operational_alerts',
  'order_items',
  'order_status_history',
  'orders',
  'outbox_events',
  'payment_logs',
  'payment_reconciliation_cases',
  'payments',
  'product_images',
  'product_reviews',
  'products',
  'profiles',
  'retry_jobs',
  'shipment_events',
  'shipment_health',
  'site_settings',
  'sync_jobs',
  'tracking_snapshots',
  'webhook_events',
]

const privilegedRpcNames = [
  'add_cart_item_checked',
  'add_product_image_atomic',
  'attach_razorpay_order',
  'begin_invoice_generation',
  'check_webhook_duplicate',
  'claim_razorpay_webhook',
  'claim_notification_deliveries',
  'claim_notification_outbox',
  'claim_operation_lease',
  'complete_notification_delivery',
  'complete_notification_outbox',
  'complete_razorpay_webhook',
  'decrement_stock',
  'delete_product_image_atomic',
  'enqueue_retry_job',
  'expire_abandoned_checkouts',
  'fail_checkout_fenced',
  'fail_checkout',
  'fail_notification_delivery',
  'fail_notification_outbox',
  'fail_razorpay_webhook',
  'finalize_captured_payment',
  'finalize_captured_payment_fenced',
  'generate_order_number',
  'get_product_review_summaries',
  'get_runtime_schema_status',
  'increment_coupon_usage',
  'initialize_checkout',
  'reorder_product_images_atomic',
  'renew_razorpay_webhook_lease',
  'renew_operation_lease',
  'renew_retry_job_lease',
  'release_operation_lease',
  'set_cart_item_quantity_checked',
  'set_default_address',
  'skip_notification_delivery',
  'transition_order_status',
  'update_site_settings_bulk',
]

function createSupabaseClient(key) {
  return createClient(apiUrl, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

async function createIdentity(service, label) {
  const email = `${label}-${crypto.randomUUID()}@example.com`
  const password = `Test-${crypto.randomUUID()}-9a!`
  const { data, error } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  assert.ifError(error)
  assert.ok(data.user)
  return { email, password, user: data.user }
}

async function authenticatedIdentity(identity) {
  const client = createSupabaseClient(anonKey)
  const { data, error } = await client.auth.signInWithPassword({
    email: identity.email,
    password: identity.password,
  })
  assert.ifError(error)
  assert.ok(data.session?.access_token)
  return { client, accessToken: data.session.access_token }
}

async function getRestPaths(accessToken, apiKey = anonKey) {
  const response = await fetch(`${apiUrl}/rest/v1/`, {
    headers: {
      accept: 'application/openapi+json',
      apikey: apiKey,
      authorization: `Bearer ${accessToken}`,
    },
  })
  assert.equal(response.status, 200)
  const schema = await response.json()
  return new Set(Object.keys(schema.paths ?? {}))
}

function assertPermissionDenied(error, operation) {
  assert.ok(error, `${operation} unexpectedly succeeded`)
  assert.equal(error.code, '42501', `${operation} failed for the wrong reason: ${error.message}`)
}

test(
  'database roles preserve the API-only commerce boundary',
  { skip: !shouldRun },
  async (context) => {
    const service = createSupabaseClient(serviceRoleKey)
    const anonymous = createSupabaseClient(anonKey)
    const customerIdentity = await createIdentity(service, 'customer')
    const adminIdentity = await createIdentity(service, 'admin')

    context.after(async () => {
      await service.auth.admin.deleteUser(customerIdentity.user.id)
      await service.auth.admin.deleteUser(adminIdentity.user.id)
    })

    const customer = await authenticatedIdentity(customerIdentity)
    const admin = await authenticatedIdentity(adminIdentity)

    const { error: promoteAdminError } = await service
      .from('profiles')
      .update({ role: 'admin' })
      .eq('id', adminIdentity.user.id)
    assert.ifError(promoteAdminError)

    await context.test(
      'anonymous and authenticated clients cannot read application relations',
      async () => {
        for (const relation of applicationRelations) {
          const { error: anonymousError } = await anonymous.from(relation).select('*').limit(1)
          assertPermissionDenied(anonymousError, `anonymous SELECT on ${relation}`)

          const { error: customerError } = await customer.client.from(relation).select('*').limit(1)
          assertPermissionDenied(customerError, `customer SELECT on ${relation}`)
        }
      }
    )

    await context.test('service role can read every application relation', async () => {
      for (const relation of applicationRelations) {
        const { error } = await service.from(relation).select('*').limit(1)
        assert.ifError(error)
      }
    })

    await context.test('direct profile and commerce mutations remain unavailable', async () => {
      const { error: roleEscalationError } = await customer.client
        .from('profiles')
        .update({ role: 'admin' })
        .eq('id', customerIdentity.user.id)
      assertPermissionDenied(roleEscalationError, 'customer role escalation')

      for (const relation of [
        'orders',
        'order_items',
        'product_reviews',
        'retry_jobs',
        'webhook_events',
        'sync_jobs',
        'order_status_history',
        'notification_logs',
        'tracking_snapshots',
      ]) {
        const { error } = await customer.client.from(relation).insert({})
        assertPermissionDenied(error, `customer INSERT on ${relation}`)
      }
    })

    await context.test(
      'only the self-scoped admin helper is exposed to authenticated clients',
      async () => {
        const anonymousPaths = await getRestPaths(anonKey)
        const customerPaths = await getRestPaths(customer.accessToken)
        const servicePaths = await getRestPaths(serviceRoleKey, serviceRoleKey)

        for (const rpcName of privilegedRpcNames) {
          assert.equal(anonymousPaths.has(`/rpc/${rpcName}`), false)
          assert.equal(customerPaths.has(`/rpc/${rpcName}`), false)
          assert.equal(servicePaths.has(`/rpc/${rpcName}`), true)
        }

        assert.equal(anonymousPaths.has('/rpc/is_admin'), false)
        assert.equal(customerPaths.has('/rpc/is_admin'), true)

        const { data: schemaStatus, error: schemaStatusError } = await service.rpc(
          'get_runtime_schema_status'
        )
        assert.ifError(schemaStatusError)
        assert.equal(schemaStatus.contract_version, 43)
        assert.equal(schemaStatus.migration_version, '043')
        assert.equal(schemaStatus.ready, true)
        for (const [key, value] of Object.entries(schemaStatus)) {
          if (key.startsWith('missing_') || key.startsWith('invalid_')) {
            assert.deepEqual(value, [], `${key} reported schema drift`)
          }
        }

        const { data: customerIsAdmin, error: customerAdminError } = await customer.client.rpc(
          'is_admin',
          { user_id: customerIdentity.user.id }
        )
        assert.ifError(customerAdminError)
        assert.equal(customerIsAdmin, false)

        const { data: adminIsAdmin, error: adminAdminError } = await admin.client.rpc('is_admin', {
          user_id: adminIdentity.user.id,
        })
        assert.ifError(adminAdminError)
        assert.equal(adminIsAdmin, true)

        const { data: crossUserIsAdmin, error: crossUserAdminError } = await admin.client.rpc(
          'is_admin',
          { user_id: customerIdentity.user.id }
        )
        assert.ifError(crossUserAdminError)
        assert.equal(crossUserIsAdmin, false)
      }
    )

    await context.test('service-only stock RPC validates input and remains callable', async () => {
      const { data, error } = await service.rpc('decrement_stock', {
        p_product_id: crypto.randomUUID(),
        p_qty: 1,
      })
      assert.ifError(error)
      assert.equal(data, null)

      const { error: invalidQuantityError } = await service.rpc('decrement_stock', {
        p_product_id: crypto.randomUUID(),
        p_qty: -1,
      })
      assert.ok(invalidQuantityError)
      assert.equal(invalidQuantityError.code, '22023')
    })
  }
)
