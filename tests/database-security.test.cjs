const assert = require('node:assert/strict')
const crypto = require('node:crypto')
const test = require('node:test')
const { createClient } = require('../server/node_modules/@supabase/supabase-js')

const apiUrl = process.env.SUPABASE_TEST_URL
const anonKey = process.env.SUPABASE_TEST_ANON_KEY
const serviceRoleKey = process.env.SUPABASE_TEST_SERVICE_ROLE_KEY
const shouldRun = Boolean(apiUrl && anonKey && serviceRoleKey)

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

async function authenticatedClient(identity) {
  const client = createClient(apiUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { error } = await client.auth.signInWithPassword({
    email: identity.email,
    password: identity.password,
  })
  assert.ifError(error)
  return client
}

test(
  'anon, customer, admin, and service identities preserve the security boundary',
  { skip: !shouldRun },
  async (context) => {
    const service = createClient(apiUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    const anonymous = createClient(apiUrl, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    const customerIdentity = await createIdentity(service, 'customer')
    const adminIdentity = await createIdentity(service, 'admin')
    context.after(async () => {
      await service.auth.admin.deleteUser(customerIdentity.user.id)
      await service.auth.admin.deleteUser(adminIdentity.user.id)
    })

    const customer = await authenticatedClient(customerIdentity)
    const admin = await authenticatedClient(adminIdentity)
    const { error: promoteError } = await service
      .from('profiles')
      .update({ role: 'admin' })
      .eq('id', adminIdentity.user.id)
    assert.ifError(promoteError)

    const { error: anonymousJobError } = await anonymous.from('retry_jobs').insert({
      job_type: 'tracking_sync',
      reference_id: 'forbidden',
      payload: {},
    })
    assert.ok(anonymousJobError)

    const { error: roleEscalationError } = await customer
      .from('profiles')
      .update({ role: 'admin' })
      .eq('id', customerIdentity.user.id)
    assert.ok(roleEscalationError)

    const { error: orderInsertError } = await customer.from('orders').insert({
      user_id: customerIdentity.user.id,
      order_number: `TEST-${crypto.randomUUID()}`,
    })
    assert.ok(orderInsertError)

    const { error: reviewInsertError } = await customer.from('product_reviews').insert({
      product_id: crypto.randomUUID(),
      user_id: customerIdentity.user.id,
      rating: 5,
    })
    assert.ok(reviewInsertError)

    const { error: customerRpcError } = await customer.rpc('decrement_stock', {
      p_product_id: crypto.randomUUID(),
      p_qty: 1,
    })
    assert.ok(customerRpcError)

    const { data: visibleProfiles, error: adminReadError } = await admin
      .from('profiles')
      .select('id')
      .in('id', [customerIdentity.user.id, adminIdentity.user.id])
    assert.ifError(adminReadError)
    assert.equal(visibleProfiles.length, 2)

    const { error: serviceRpcError } = await service.rpc('decrement_stock', {
      p_product_id: crypto.randomUUID(),
      p_qty: -1,
    })
    assert.ok(serviceRpcError)
  }
)
