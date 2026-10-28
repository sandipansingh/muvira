const assert = require('node:assert/strict')

const shippingSettings = {
  pickup_location: 'Registered fixture',
  default_weight_grams: 500,
  default_length_cm: 15,
  default_breadth_cm: 10,
  default_height_cm: 5,
}

async function configureShippingFixture(client) {
  const { data: saved, error } = await client
    .from('site_settings')
    .select('value')
    .eq('key', 'shiprocket_settings')
    .maybeSingle()
  assert.ifError(error)
  assert.ifError(
    (
      await client
        .from('site_settings')
        .upsert({ key: 'shiprocket_settings', value: shippingSettings })
    ).error
  )
  return async () => {
    if (saved)
      assert.ifError(
        (
          await client
            .from('site_settings')
            .update({ value: saved.value })
            .eq('key', 'shiprocket_settings')
        ).error
      )
    else
      assert.ifError(
        (await client.from('site_settings').delete().eq('key', 'shiprocket_settings')).error
      )
  }
}

async function checkoutShippingVerification(client, userId, checkout) {
  const response = await client.rpc('get_checkout_shipping_context', {
    p_user_id: userId,
    p_address_id: checkout.address_id,
    p_shipping_method: checkout.shipping_method,
    p_coupon_code: checkout.coupon_code ?? null,
  })
  assert.ifError(response.error)
  return {
    ...response.data,
    checked_at: new Date().toISOString(),
    availability: {
      available: true,
      pickup_pincode: '400001',
      estimated_delivery_days: 3,
      recommended_courier: {
        courier_id: 1,
        courier_name: 'Fixture courier',
        rate_paisa: 5000,
        estimated_delivery_days: 3,
        cod: false,
      },
    },
  }
}

function mockShippingProvider(t) {
  const provider = require('../../server/dist/services/shiprocket.js')
  t.mock.method(provider, 'getPickupLocations', async () => [
    { pickup_location: shippingSettings.pickup_location, pincode: '400001', pickup_id: 1 },
  ])
  t.mock.method(provider, 'checkServiceability', async () => ({
    available_courier: [
      {
        courier_id: 1,
        courier_name: 'Fixture courier',
        rate_paisa: 5000,
        estimated_delivery_days: 3,
        cod: false,
      },
    ],
  }))
}

module.exports = { configureShippingFixture, checkoutShippingVerification, mockShippingProvider }
