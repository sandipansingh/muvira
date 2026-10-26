require('./helpers/assert-local-test-db.cjs').assertLocalTestDb()
const assert = require('node:assert/strict')
const { randomUUID } = require('node:crypto')
const test = require('node:test')
const { serviceClient } = require('./helpers/provider-db-fixture.cjs')
const url = process.env.SUPABASE_TEST_URL
const key = process.env.SUPABASE_TEST_SERVICE_ROLE_KEY

test(
  'transfer readiness detects table grants, deduplication key, quantity constraint and service access drift',
  { skip: !url || !key },
  () => {
    const { execFileSync } = require('node:child_process')
    const assertUnready = `DO $$ BEGIN IF (public.get_runtime_schema_status()->>'ready')::BOOLEAN THEN RAISE EXCEPTION 'Structural drift was not detected'; END IF; END $$;`
    const mutations = [
      'GRANT SELECT ON public.guest_cart_transfers TO anon;',
      'GRANT SELECT(operation_id) ON public.guest_cart_transfers TO authenticated;',
      'ALTER TABLE public.guest_cart_transfers DROP CONSTRAINT guest_cart_transfers_pkey;',
      'ALTER TABLE public.guest_cart_transfers DROP CONSTRAINT guest_cart_transfers_quantity_check;',
      'REVOKE INSERT ON public.guest_cart_transfers FROM service_role;',
      'ALTER TABLE public.guest_cart_transfers ALTER COLUMN result DROP NOT NULL;',
    ]
    for (const mutation of mutations)
      execFileSync(
        'docker',
        [
          'exec',
          '-i',
          'supabase_db_muvira',
          'psql',
          '-U',
          'postgres',
          '-d',
          'postgres',
          '-v',
          'ON_ERROR_STOP=1',
        ],
        { input: `BEGIN; ${mutation} ${assertUnready} ROLLBACK;`, stdio: ['pipe', 'pipe', 'pipe'] }
      )
  }
)

test(
  'transfer ledger serializes duplicate requests, binds account and input, retains rejected results',
  { skip: !url || !key },
  async () => {
    const client = serviceClient(url, key)
    const users = []
    let productId
    try {
      for (let i = 0; i < 2; i++) {
        const { data, error } = await client.auth.admin.createUser({
          email: `cart-${randomUUID()}@example.com`,
          password: `Test-${randomUUID()}-9a!`,
          email_confirm: true,
        })
        assert.ifError(error)
        users.push(data.user.id)
      }
      const { data: categories, error: categoryError } = await client
        .from('categories')
        .select('id')
        .limit(1)
      assert.ifError(categoryError)
      const { data: product, error: productError } = await client
        .from('products')
        .insert({
          name: 'Cart transfer fixture',
          slug: `cart-${randomUUID()}`,
          price_paisa: 100,
          stock: 20,
          is_active: true,
          category_id: categories[0]?.id,
        })
        .select('id')
        .single()
      assert.ifError(productError)
      productId = product.id
      const input = {
        p_operation_id: randomUUID(),
        p_user_id: users[0],
        p_product_id: productId,
        p_quantity: 2,
      }
      const results = await Promise.all(
        Array.from({ length: 8 }, () => client.rpc('merge_guest_cart_item', input))
      )
      for (const result of results) {
        assert.ifError(result.error)
        assert.equal(result.data.status, 'applied')
      }
      const { data: cart, error: cartError } = await client
        .from('cart_items')
        .select('quantity')
        .eq('user_id', users[0])
        .eq('product_id', productId)
        .single()
      assert.ifError(cartError)
      assert.equal(cart.quantity, 2)
      for (const changed of [
        { p_user_id: users[1] },
        { p_product_id: randomUUID() },
        { p_quantity: 3 },
      ]) {
        const result = await client.rpc('merge_guest_cart_item', { ...input, ...changed })
        assert.match(result.error.message, /conflicts/)
      }
      const unavailable = { ...input, p_operation_id: randomUUID(), p_quantity: 30 }
      const rejected = await client.rpc('merge_guest_cart_item', unavailable)
      assert.ifError(rejected.error)
      assert.equal(rejected.data.status, 'rejected')
      await client.from('products').update({ stock: 100 }).eq('id', productId)
      assert.deepEqual((await client.rpc('merge_guest_cart_item', unavailable)).data, rejected.data)
      const corrected = await client.rpc('merge_guest_cart_item', {
        ...unavailable,
        p_operation_id: randomUUID(),
        p_quantity: 1,
      })
      assert.ifError(corrected.error)
      assert.equal(corrected.data.status, 'applied')
      const { data: contract, error: contractError } = await client.rpc('get_runtime_schema_status')
      assert.ifError(contractError)
      assert.equal(contract.ready, true)
      assert.ok(contract.contract_version >= 50)
    } finally {
      for (const id of users) {
        await client.from('cart_items').delete().eq('user_id', id)
        await client.auth.admin.deleteUser(id)
      }
      if (productId) await client.from('products').delete().eq('id', productId)
    }
  }
)
