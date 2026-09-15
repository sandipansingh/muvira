const assert = require('node:assert/strict')
const crypto = require('node:crypto')
const { once } = require('node:events')
const test = require('node:test')
const { createClient } = require('../server/node_modules/@supabase/supabase-js')

const supabaseUrl = process.env.SUPABASE_TEST_URL
const anonKey = process.env.SUPABASE_TEST_ANON_KEY
const serviceRoleKey = process.env.SUPABASE_TEST_SERVICE_ROLE_KEY
const shouldRun = Boolean(supabaseUrl && anonKey && serviceRoleKey)

Object.assign(process.env, {
  NODE_ENV: 'test',
  PORT: '4000',
  LOG_LEVEL: 'fatal',
  SUPABASE_URL: supabaseUrl ?? 'https://example.supabase.co',
  SUPABASE_ANON_KEY: anonKey ?? 'test-anon-key-value',
  SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey ?? 'test-service-role-key-value',
  RAZORPAY_KEY_ID: 'rzp_test_integration',
  RAZORPAY_KEY_SECRET: 'integration-payment-signature-secret',
  RAZORPAY_WEBHOOK_SECRET: 'integration-webhook-signature-secret',
  ALLOWED_ORIGINS: 'http://localhost:5173',
  EMAIL_FROM: 'orders@example.com',
  ORDER_PREFIX: 'TST',
  CACHE_ENABLED: 'false',
  CACHE_DEBUG: 'false',
  SHIPROCKET_EMAIL: 'shipping@example.com',
  SHIPROCKET_PASSWORD: 'test-password',
  SHIPROCKET_WEBHOOK_ENABLED: 'false',
})

const { createApp } = require('../server/dist/app.js')
const { razorpay } = require('../server/dist/lib/razorpay/client.js')

function serviceClient() {
  return createClient(supabaseUrl, serviceRoleKey, {
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

  const client = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data: sessionData, error: sessionError } = await client.auth.signInWithPassword({
    email,
    password,
  })
  assert.ifError(sessionError)
  assert.ok(sessionData.session?.access_token)

  return {
    email,
    userId: data.user.id,
    accessToken: sessionData.session.access_token,
  }
}

async function request(baseUrl, path, options = {}) {
  const headers = { ...(options.headers ?? {}) }
  if (options.accessToken) headers.authorization = `Bearer ${options.accessToken}`
  if (options.body !== undefined && !headers['content-type']) {
    headers['content-type'] = 'application/json'
  }

  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body:
      options.body === undefined
        ? undefined
        : typeof options.body === 'string'
          ? options.body
          : JSON.stringify(options.body),
  })
  const rawBody = await response.text()
  const parsedBody = rawBody ? JSON.parse(rawBody) : null
  return { status: response.status, body: parsedBody }
}

async function insertFixture(service, relation, values) {
  const { data, error } = await service.from(relation).insert(values).select().single()
  assert.ifError(error)
  return data
}

test(
  'HTTP commerce contracts preserve authoritative totals, ownership, and idempotency',
  { skip: !shouldRun },
  async (context) => {
    const service = serviceClient()
    const customer = await createIdentity(service, 'checkout-customer')
    const otherCustomer = await createIdentity(service, 'other-customer')
    const admin = await createIdentity(service, 'operations-admin')
    const testId = crypto.randomUUID()
    const providerOrderId = `order_${testId.replaceAll('-', '')}`
    const providerPaymentId = `pay_${testId.replaceAll('-', '')}`
    const webhookEventId = `evt_${testId.replaceAll('-', '')}`
    const originalOrderCreate = razorpay.orders.create
    const originalOrderFetch = razorpay.orders.fetch
    const originalPaymentFetch = razorpay.payments.fetch
    const appServer = createApp().listen(0)
    await once(appServer, 'listening')
    const address = appServer.address()
    assert.ok(address && typeof address === 'object')
    const baseUrl = `http://127.0.0.1:${address.port}`

    let createdOrderId
    let categoryId
    let productId
    let couponId

    context.after(async () => {
      razorpay.orders.create = originalOrderCreate
      razorpay.orders.fetch = originalOrderFetch
      razorpay.payments.fetch = originalPaymentFetch
      appServer.close()
      await once(appServer, 'close')

      const userIds = [customer.userId, otherCustomer.userId, admin.userId]
      const { data: orders } = await service.from('orders').select('id').in('user_id', userIds)
      const orderIds = (orders ?? []).map((order) => order.id)
      if (orderIds.length > 0) {
        await service.from('outbox_events').delete().in('aggregate_id', orderIds)
        await service.from('orders').delete().in('id', orderIds)
      }
      await service.from('webhook_events').delete().eq('event_id', webhookEventId)
      if (couponId) await service.from('coupons').delete().eq('id', couponId)
      if (productId) await service.from('products').delete().eq('id', productId)
      if (categoryId) await service.from('categories').delete().eq('id', categoryId)
      for (const userId of userIds) await service.auth.admin.deleteUser(userId)
    })

    const { error: promoteAdminError } = await service
      .from('profiles')
      .update({ role: 'admin' })
      .eq('id', admin.userId)
    assert.ifError(promoteAdminError)

    const category = await insertFixture(service, 'categories', {
      name: 'Integration Category',
      slug: `integration-category-${testId}`,
    })
    categoryId = category.id

    const product = await insertFixture(service, 'products', {
      name: 'Integration Product',
      slug: `integration-product-${testId}`,
      category_id: category.id,
      price_paisa: 45000,
      stock: 5,
      is_active: true,
    })
    productId = product.id

    const coupon = await insertFixture(service, 'coupons', {
      code: `TEST${testId.replaceAll('-', '').slice(0, 12).toUpperCase()}`,
      discount_type: 'fixed',
      discount_value: 5000,
      min_order_amount_paisa: 0,
      max_uses: 1,
      is_active: true,
      valid_from: new Date(Date.now() - 60_000).toISOString(),
    })
    couponId = coupon.id

    const shippingAddress = await insertFixture(service, 'addresses', {
      user_id: customer.userId,
      full_name: 'Checkout Customer',
      phone: '9876543210',
      address_line1: '1 Integration Road',
      city: 'Kolkata',
      state: 'West Bengal',
      pincode: '700001',
      country: 'India',
      is_default: true,
    })

    await context.test(
      'storefront catalog, search, detail, related products, and reviews use live data',
      async () => {
        const list = await request(
          baseUrl,
          `/api/products?search=${encodeURIComponent('Integration Product')}`
        )
        assert.equal(list.status, 200)
        assert.equal(
          list.body.data.some((item) => item.id === product.id),
          true
        )

        const detail = await request(baseUrl, `/api/products/${product.slug}`)
        assert.equal(detail.status, 200)
        assert.equal(detail.body.data.id, product.id)
        assert.equal(detail.body.data.price_paisa, 45000)

        const related = await request(baseUrl, `/api/products/${product.id}/related`)
        assert.equal(related.status, 200)
        assert.ok(Array.isArray(related.body.data))

        const reviews = await request(baseUrl, `/api/products/${product.id}/reviews`)
        assert.equal(reviews.status, 200)
        assert.deepEqual(reviews.body.data.reviews, [])
        assert.equal(reviews.body.data.summary.totalReviews, 0)
      }
    )

    await context.test('admin routes enforce authentication and database role', async () => {
      const unauthenticated = await request(baseUrl, '/api/admin/orders')
      assert.equal(unauthenticated.status, 401)
      assert.equal(unauthenticated.body.error.code, 'UNAUTHORIZED')

      const forbidden = await request(baseUrl, '/api/admin/orders', {
        accessToken: customer.accessToken,
      })
      assert.equal(forbidden.status, 403)
      assert.equal(forbidden.body.error.code, 'FORBIDDEN')
    })

    await context.test(
      'quote derives all amounts from the current cart and server settings',
      async () => {
        const addResult = await request(baseUrl, '/api/cart', {
          method: 'POST',
          accessToken: customer.accessToken,
          body: { product_id: product.id, quantity: 2 },
        })
        assert.equal(addResult.status, 201)

        const rejectedQuote = await request(baseUrl, '/api/checkout/quote', {
          method: 'POST',
          accessToken: customer.accessToken,
          body: { shipping_method: 'standard', subtotal_paisa: 1 },
        })
        assert.equal(rejectedQuote.status, 400)
        assert.equal(rejectedQuote.body.error.code, 'VALIDATION_ERROR')

        const quoteResult = await request(baseUrl, '/api/checkout/quote', {
          method: 'POST',
          accessToken: customer.accessToken,
          body: { shipping_method: 'standard', coupon_code: coupon.code },
        })
        assert.equal(quoteResult.status, 200)
        assert.deepEqual(
          {
            subtotal_paisa: quoteResult.body.data.subtotal_paisa,
            discount_amount_paisa: quoteResult.body.data.discount_amount_paisa,
            shipping_amount_paisa: quoteResult.body.data.shipping_amount_paisa,
            total_amount_paisa: quoteResult.body.data.total_amount_paisa,
          },
          {
            subtotal_paisa: 90000,
            discount_amount_paisa: 5000,
            shipping_amount_paisa: 15000,
            total_amount_paisa: 100000,
          }
        )
      }
    )

    let providerCreateInput
    razorpay.orders.create = async (input) => {
      providerCreateInput = input
      return {
        id: providerOrderId,
        amount: 100000,
        amount_paid: 0,
        amount_due: 100000,
        currency: 'INR',
        receipt: input.receipt,
        status: 'created',
        attempts: 0,
        created_at: Math.floor(Date.now() / 1000),
      }
    }

    await context.test(
      'order creation sends only the reserved database total to Razorpay',
      async () => {
        const rejectedCreate = await request(baseUrl, '/api/checkout/create-order', {
          method: 'POST',
          accessToken: customer.accessToken,
          body: {
            address_id: shippingAddress.id,
            shipping_method: 'standard',
            billing_same_as_shipping: true,
            coupon_code: coupon.code,
            amount: 1,
          },
        })
        assert.equal(rejectedCreate.status, 400)
        assert.equal(rejectedCreate.body.error.code, 'VALIDATION_ERROR')

        const createResult = await request(baseUrl, '/api/checkout/create-order', {
          method: 'POST',
          accessToken: customer.accessToken,
          body: {
            address_id: shippingAddress.id,
            shipping_method: 'standard',
            billing_same_as_shipping: true,
            coupon_code: coupon.code,
          },
        })
        assert.equal(createResult.status, 201)
        assert.equal(createResult.body.data.amount_paisa, 100000)
        assert.equal(createResult.body.data.razorpay_order_id, providerOrderId)
        assert.equal(providerCreateInput.amount, 100000)
        assert.equal(providerCreateInput.currency, 'INR')
        assert.equal(providerCreateInput.payment.capture, 'automatic')
        createdOrderId = createResult.body.data.order_id
      }
    )

    razorpay.payments.fetch = async () => ({
      id: providerPaymentId,
      order_id: providerOrderId,
      amount: 100000,
      currency: 'INR',
      status: 'captured',
      captured: true,
      method: 'upi',
    })
    razorpay.orders.fetch = async () => ({
      id: providerOrderId,
      amount: 100000,
      amount_paid: 100000,
      currency: 'INR',
      status: 'paid',
    })

    await context.test('verified payment finalizes reservations exactly once', async () => {
      const signature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(`${providerOrderId}|${providerPaymentId}`)
        .digest('hex')
      const verificationBody = {
        razorpay_order_id: providerOrderId,
        razorpay_payment_id: providerPaymentId,
        razorpay_signature: signature,
      }

      const firstVerification = await request(baseUrl, '/api/payments/verify', {
        method: 'POST',
        accessToken: customer.accessToken,
        body: verificationBody,
      })
      assert.equal(firstVerification.status, 200)
      assert.equal(firstVerification.body.data.payment_status, 'paid')
      assert.equal(firstVerification.body.data.status, 'confirmed')
      assert.equal(firstVerification.body.data.already_captured, false)

      const repeatedVerification = await request(baseUrl, '/api/payments/verify', {
        method: 'POST',
        accessToken: customer.accessToken,
        body: verificationBody,
      })
      assert.equal(repeatedVerification.status, 200)
      assert.equal(repeatedVerification.body.data.already_captured, true)

      const [stockResult, couponResult, cartResult, reservationResult, outboxResult] =
        await Promise.all([
          service.from('products').select('stock').eq('id', product.id).single(),
          service.from('coupons').select('times_used').eq('id', coupon.id).single(),
          service.from('cart_items').select('id').eq('user_id', customer.userId),
          service.from('inventory_reservations').select('status').eq('order_id', createdOrderId),
          service
            .from('outbox_events')
            .select('id')
            .eq('deduplication_key', `order.payment_captured:${createdOrderId}`),
        ])

      for (const result of [
        stockResult,
        couponResult,
        cartResult,
        reservationResult,
        outboxResult,
      ]) {
        assert.ifError(result.error)
      }
      assert.equal(stockResult.data.stock, 3)
      assert.equal(couponResult.data.times_used, 1)
      assert.equal(cartResult.data.length, 0)
      assert.deepEqual(
        reservationResult.data.map((row) => row.status),
        ['committed']
      )
      assert.equal(outboxResult.data.length, 1)
    })

    await context.test(
      'late failures and duplicate event IDs cannot downgrade a paid order',
      async () => {
        const webhookPayload = {
          entity: 'event',
          event: 'payment.failed',
          payload: {
            payment: {
              entity: {
                id: providerPaymentId,
                order_id: providerOrderId,
                amount: 100000,
                currency: 'INR',
                status: 'failed',
                captured: false,
                method: 'upi',
                error_description: 'Late provider failure',
              },
            },
          },
        }
        const firstRawBody = JSON.stringify(webhookPayload)
        const firstSignature = crypto
          .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
          .update(firstRawBody)
          .digest('hex')
        const firstWebhook = await request(baseUrl, '/api/webhooks/razorpay', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-razorpay-event-id': webhookEventId,
            'x-razorpay-signature': firstSignature,
          },
          body: firstRawBody,
        })
        assert.equal(firstWebhook.status, 200)
        assert.equal(firstWebhook.body.data.status, 'processed')

        const repeatedRawBody = JSON.stringify({ ...webhookPayload, replay: true })
        const repeatedSignature = crypto
          .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
          .update(repeatedRawBody)
          .digest('hex')
        const repeatedWebhook = await request(baseUrl, '/api/webhooks/razorpay', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-razorpay-event-id': webhookEventId,
            'x-razorpay-signature': repeatedSignature,
          },
          body: repeatedRawBody,
        })
        assert.equal(repeatedWebhook.status, 200)
        assert.equal(repeatedWebhook.body.data.status, 'duplicate')

        const { data: order, error: orderError } = await service
          .from('orders')
          .select('status, payment_status')
          .eq('id', createdOrderId)
          .single()
        assert.ifError(orderError)
        assert.deepEqual(order, { status: 'confirmed', payment_status: 'paid' })
      }
    )

    await context.test('customer and admin order read models enforce their contracts', async () => {
      const ownOrder = await request(baseUrl, `/api/orders/${createdOrderId}`, {
        accessToken: customer.accessToken,
      })
      assert.equal(ownOrder.status, 200)
      assert.ok(Array.isArray(ownOrder.body.data.order_items))

      const crossUserOrder = await request(baseUrl, `/api/orders/${createdOrderId}`, {
        accessToken: otherCustomer.accessToken,
      })
      assert.equal(crossUserOrder.status, 404)
      assert.equal(crossUserOrder.body.error.code, 'ORDER_NOT_FOUND')

      const adminList = await request(
        baseUrl,
        `/api/admin/orders?q=${encodeURIComponent(customer.email)}`,
        { accessToken: admin.accessToken }
      )
      assert.equal(adminList.status, 200)
      assert.equal(adminList.body.data.length, 1)
      assert.equal(adminList.body.data[0].id, createdOrderId)
      assert.equal('order_items' in adminList.body.data[0], false)

      const adminDetail = await request(baseUrl, `/api/admin/orders/${createdOrderId}`, {
        accessToken: admin.accessToken,
      })
      assert.equal(adminDetail.status, 200)
      assert.ok(Array.isArray(adminDetail.body.data.order_items))
      assert.ok(Array.isArray(adminDetail.body.data.payments))
    })
  }
)
