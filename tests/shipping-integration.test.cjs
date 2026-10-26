require('./helpers/assert-local-test-db.cjs').assertLocalTestDb()
const assert = require('node:assert/strict')
const test = require('node:test')
const {
  serviceClient,
  createOrderFixture,
  createPaymentFixture,
  cleanupOrderFixture,
} = require('./helpers/provider-db-fixture.cjs')
const url = process.env.SUPABASE_TEST_URL
const key = process.env.SUPABASE_TEST_SERVICE_ROLE_KEY

test(
  'shipping configuration writes are atomic, zero-fee and preserve payment snapshots',
  { skip: !url || !key },
  async () => {
    const client = serviceClient(url, key)
    const { data: saved, error } = await client
      .from('site_settings')
      .select('key,value')
      .in('key', ['shipping_methods', 'shipping_rules', 'shiprocket_settings'])
    assert.ifError(error)
    const fixture = await createOrderFixture(client)
    try {
      const payment = await createPaymentFixture(client, fixture, {
        status: 'created',
        razorpayPaymentId: null,
      })
      for (const shipping_method of ['standard', 'express']) {
        const methods = saved.find((row) => row.key === 'shipping_methods').value
        assert.equal(methods[shipping_method].charge_paisa, 0)
        assert.equal(methods[shipping_method].free_threshold_paisa, 0)
        const invalid = structuredClone(methods)
        invalid[shipping_method].charge_paisa = 1
        assert.ok(
          (
            await client.rpc('update_site_settings_bulk', {
              p_settings: { shipping_methods: invalid },
            })
          ).error
        )
        assert.ok(
          (
            await client
              .from('site_settings')
              .update({ value: invalid })
              .eq('key', 'shipping_methods')
          ).error
        )
      }
      assert.ok(
        (
          await client.rpc('update_site_settings_bulk', {
            p_settings: {
              shipping_rules: { shipping_charge_paisa: 100, free_shipping_threshold_paisa: 0 },
            },
          })
        ).error
      )
      const config = {
        pickup_location: 'Registered fixture',
        default_length_cm: 15,
        default_breadth_cm: 10,
        default_height_cm: 5,
        default_weight_grams: 500,
      }
      assert.ifError(
        (
          await client.rpc('update_site_settings_bulk', {
            p_settings: { shiprocket_settings: config },
          })
        ).error
      )
      assert.ifError(
        (
          await client.rpc('update_site_settings_bulk', {
            p_settings: { shiprocket_settings: { default_weight_grams: 750 } },
          })
        ).error
      )
      assert.deepEqual(
        (
          await client
            .from('site_settings')
            .select('value')
            .eq('key', 'shiprocket_settings')
            .single()
        ).data.value,
        { ...config, default_weight_grams: 750 }
      )
      const bad = await client.rpc('update_site_settings_bulk', {
        p_settings: {
          shiprocket_settings: { default_weight_grams: 900 },
          shipping_rules: { shipping_charge_paisa: 1, free_shipping_threshold_paisa: 0 },
        },
      })
      assert.ok(bad.error)
      assert.equal(
        (
          await client
            .from('site_settings')
            .select('value')
            .eq('key', 'shiprocket_settings')
            .single()
        ).data.value.default_weight_grams,
        750
      )
      assert.equal(
        (await client.from('payments').select('amount_paisa').eq('id', payment.paymentId).single())
          .data.amount_paisa,
        fixture.amountPaisa
      )
      assert.equal(
        (
          await client
            .from('orders')
            .select('total_amount_paisa')
            .eq('id', fixture.orderId)
            .single()
        ).data.total_amount_paisa,
        fixture.amountPaisa
      )
    } finally {
      await cleanupOrderFixture(client, fixture)
      for (const row of saved) await client.from('site_settings').upsert(row)
      if (!saved.some((row) => row.key === 'shiprocket_settings'))
        await client.from('site_settings').delete().eq('key', 'shiprocket_settings')
    }
  }
)
