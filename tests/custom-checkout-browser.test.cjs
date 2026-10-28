const assert = require('node:assert/strict')
const { before, after, test } = require('node:test')
const { chromium, webkit, expect } = require('playwright/test')
const { mkdir } = require('node:fs/promises')
const { join } = require('node:path')
let fixture
const browsers = {}
async function screenshot(page, name) {
  if (!process.env.MUVIRA_CHECKOUT_SCREENSHOTS_DIR) return
  await mkdir(process.env.MUVIRA_CHECKOUT_SCREENSHOTS_DIR, { recursive: true })
  await page.screenshot({
    path: join(process.env.MUVIRA_CHECKOUT_SCREENSHOTS_DIR, `${name}.png`),
    fullPage: true,
  })
}
before(async () => {
  fixture = await (
    await import('./fixtures/editorial-server.mjs')
  ).startEditorialServer({ customCheckout: true })
  browsers.chromium = await chromium.launch()
  browsers.webkit = await webkit.launch()
})
after(async () => {
  await Promise.all(Object.values(browsers).map((b) => b.close()))
  await fixture?.server.close()
})

async function checkoutPage(engine, options = {}, behavior = {}) {
  const page = await browsers[engine].newPage({
    viewport: { width: 1280, height: 950 },
    reducedMotion: 'reduce',
    ...options,
  })
  page.setDefaultTimeout(7000)
  const requests = []
  await page.addInitScript((settings) => {
    window.paymentFixture = { calls: [], ready: !settings.notReady, paid: false }
    window.Razorpay = class {
      constructor() {
        this.events = {}
        window.paymentFixture.sdk = this
      }
      once(_event, callback) {
        window.paymentFixture.fireReady = () =>
          callback({
            methods: settings.methods || {
              card: true,
              upi: true,
              netbanking: { HDFC: 'HDFC Bank' },
              wallet: { payzapp: true, disabled: false },
            },
          })
        setTimeout(() => {
          if (window.paymentFixture.ready) window.paymentFixture.fireReady()
        }, 0)
      }
      on(event, callback) {
        this.events[event] = callback
      }
      async getSupportedUpiIntentApps() {
        return ['phonepe', 'gpay']
      }
      createPayment(data, options) {
        window.paymentFixture.calls.push({
          method: data.method,
          amount: data.amount,
          orderId: data.order_id,
          synchronous: window.event?.isTrusted === true,
          cardMatches: data['card[number]'] === '4100280000001007',
          bank: data.bank,
          wallet: data.wallet,
          app: options?.app,
          qrFallback: data.upi?.qr,
        })
        if (options?.flow === 'qr')
          this.events['payment.upi.qr']({
            qr_url: 'upi://pay?pa=test@razorpay&am=599&cu=INR',
            expires_on: Date.now() + 600000,
            status: 'created',
          })
      }
    }
  }, behavior)
  let prepared = !!behavior.restored
  const state = { status: behavior.status || 'payable' }
  const session = () => ({
    checkout_request_id: 'test-request',
    order_id: 'fixture-order',
    order_number: 'MUV-1042',
    razorpay_order_id: 'order_custom',
    key_id: 'rzp_test_example',
    amount_paisa: 59900,
    currency: 'INR',
    expires_at: new Date(Date.now() + 900000).toISOString(),
    retention_deadline_at: null,
    server_time: new Date().toISOString(),
    state: state.status,
    can_pay: state.status === 'payable',
    snapshot: {
      items: [
        {
          product_id: 'test-product',
          product_name: 'Prepared order item',
          product_image_url: null,
          quantity: 1,
          unit_price_paisa: 59900,
          total_price_paisa: 59900,
        },
      ],
      subtotal_paisa: 59900,
      discount_amount_paisa: 0,
      shipping_amount_paisa: 0,
      tax_amount_paisa: 0,
      coupon_code: null,
      shipping_method: 'standard',
      contact_email: 'aarohi@example.test',
      shipping: {
        full_name: 'Aarohi Sen',
        phone: '9000000000',
        line1: '24 Sample Lane',
        line2: null,
        city: 'Kolkata',
        state: 'West Bengal',
        pincode: '700039',
      },
    },
  })
  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url())
    if (url.pathname.startsWith('/api/')) {
      const body = route.request().postDataJSON()
      requests.push({ path: url.pathname, body })
      let data
      if (url.pathname.endsWith('/active'))
        data = prepared ? { ...session(), state: 'pending', can_pay: false } : null
      else if (url.pathname.endsWith('/payment-config'))
        data = { key_id: 'rzp_test_example', currency: 'INR' }
      else if (url.pathname.endsWith('/quote')) {
        if (behavior.shippingOutage)
          return route.fulfill({
            status: 503,
            json: {
              success: false,
              error: {
                code: 'SHIPPING_SERVICEABILITY_UNAVAILABLE',
                message: 'Delivery availability could not be checked. Please try again shortly.',
              },
            },
          })
        data = {
          items: [],
          subtotal_paisa: 49900,
          discount_amount_paisa: 0,
          shipping_amount_paisa: 0,
          tax_amount_paisa: 0,
          total_amount_paisa: 49900,
          coupon: null,
          shipping_method: 'standard',
          shipping_label: 'Standard shipping',
          shipping_description: behavior.unknownEstimate
            ? 'Delivery estimate unavailable.'
            : 'Estimated delivery in 5 days.',
          delivery_available: behavior.unserviceable ? false : !!body.address_id,
          estimated_delivery_days: behavior.unknownEstimate ? null : 5,
          is_preview: !body.address_id,
          shipping_methods: {
            standard: {
              enabled: true,
              label: 'Standard shipping',
              description: behavior.unknownEstimate
                ? 'Delivery estimate unavailable.'
                : 'Estimated delivery in 5 days.',
              amount_paisa: 0,
              available: behavior.unserviceable ? false : true,
              estimated_delivery_days: behavior.unknownEstimate ? null : 5,
            },
            express: {
              enabled: false,
              label: 'Express shipping',
              description: 'Unavailable',
              amount_paisa: 0,
              available: false,
              estimated_delivery_days: null,
            },
          },
        }
      } else if (url.pathname.endsWith('/create-order')) {
        prepared = true
        data = session()
      } else if (url.pathname.endsWith('/reconcile')) data = session()
      else if (url.pathname.endsWith('/verify')) {
        state.status = 'paid'
        data = { order_id: 'fixture-order', payment_status: 'paid' }
      } else
        return route.fulfill({
          status: 500,
          json: {
            success: false,
            error: { code: 'UNEXPECTED', message: 'Unexpected fixture request' },
          },
        })
      return route.fulfill({ json: { success: true, data } })
    }
    if (url.origin === fixture.origin) return route.continue()
    return route.request().resourceType() === 'image'
      ? route.fulfill({ path: 'client/public/images/editorial/stone-alcove.png' })
      : route.abort()
  })
  await page.goto(fixture.origin + '/checkout?step=payment')
  await page.getByRole('heading', { level: 1 }).waitFor()
  return { page, requests, state, rawSession: session }
}

for (const engine of ['chromium', 'webkit']) {
  test(`${engine}: review prepares authoritative totals and card details go directly to the SDK on a click`, async () => {
    const { page, requests } = await checkoutPage(engine)
    try {
      await page.getByRole('radio', { name: /Credit or debit card/ }).check()
      await page.getByLabel('Name on card').fill('Aarohi Sen')
      await page.getByLabel('Card number').fill('4100 2800 0000 1007')
      await page.getByLabel('Expiry').fill('10/30')
      await page.getByLabel('Security code').fill('123')
      await page.getByRole('button', { name: 'Review payment', exact: true }).click()
      const pay = page.getByRole('button', { name: /Pay ₹599/ })
      await expect(pay).toBeEnabled()
      await expect(page.getByText('Prepared order item')).toBeVisible()
      if (engine === 'chromium') await screenshot(page, 'payment-desktop')
      await pay.click()
      const calls = await page.evaluate(() => window.paymentFixture.calls)
      assert.equal(calls.length, 1)
      assert.equal(calls[0].synchronous, true)
      assert.equal(calls[0].cardMatches, true)
      assert.equal(calls[0].amount, 59900)
      await expect(page.getByLabel('Card number')).toHaveValue('')
      const stored = await page.evaluate(() =>
        JSON.stringify({ ...localStorage, ...sessionStorage })
      )
      assert.doesNotMatch(stored + JSON.stringify(requests), /4100|card\[|securityCode|"cvv"/)
      assert.equal(requests.filter((r) => r.path.endsWith('/create-order')).length, 1)
      if (engine === 'chromium') {
        await page.evaluate(() =>
          window.paymentFixture.sdk.events['payment.error']({
            error: { description: 'Old attempt', metadata: { order_id: 'order_other' } },
          })
        )
        await Promise.all([
          page.waitForResponse((response) => response.url().endsWith('/reconcile')),
          page.getByRole('button', { name: 'Check payment status' }).click(),
        ])
        await expect(page.getByRole('button', { name: 'Check payment status' })).toBeEnabled()
        await expect(pay).toBeDisabled()
      }
    } finally {
      await page.close()
    }
  })
}

test('desktop UPI renders a live inline QR only after the final user action', async () => {
  const { page } = await checkoutPage('chromium')
  try {
    await page.getByRole('button', { name: 'Review payment', exact: true }).click()
    await expect(page.getByRole('img', { name: /Scan.*UPI/i })).toHaveCount(0)
    await page.getByRole('button', { name: /Show QR.*₹599/ }).click()
    await expect(page.getByRole('img', { name: /Scan.*UPI/i })).toBeVisible()
    await screenshot(page, 'upi-desktop')
    assert.equal((await page.evaluate(() => window.paymentFixture.calls))[0].synchronous, true)
  } finally {
    await page.close()
  }
})

test('enabled-only methods and delayed readiness never invent a fallback method', async () => {
  const { page, requests } = await checkoutPage(
    'chromium',
    {},
    { notReady: true, methods: { netbanking: { HDFC: 'HDFC Bank' } } }
  )
  try {
    await expect(page.getByText('Loading secure payment methods…')).toBeVisible()
    await expect(page.getByRole('radio', { name: /Credit or debit card/ })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Retry payment methods' })).toBeVisible({
      timeout: 8000,
    })
    await page.evaluate(() => window.paymentFixture.fireReady())
    await expect(page.getByRole('radio', { name: /Netbanking/ })).toBeChecked()
    await expect(page.getByRole('radio', { name: /^UPI/ })).toHaveCount(0)
    assert.equal(requests.filter((r) => r.path.endsWith('/create-order')).length, 0)
  } finally {
    await page.close()
  }
})

test('netbanking retries reuse the prepared order and pending outcomes block another payment', async () => {
  const { page, requests, state } = await checkoutPage('chromium')
  try {
    await page.getByRole('radio', { name: /Netbanking/ }).check()
    await page.getByRole('button', { name: 'Choose your bank' }).click()
    await page.getByRole('menuitem', { name: 'HDFC Bank', exact: true }).click()
    await page.getByRole('button', { name: 'Review payment', exact: true }).click()
    state.status = 'pending'
    await page.getByRole('button', { name: /Pay ₹599/ }).click()
    await page.evaluate(() =>
      window.paymentFixture.sdk.events['payment.error']({
        error: {
          code: 'GATEWAY_ERROR',
          description: 'Your bank is still confirming this payment.',
          source: 'bank',
          step: 'payment_authentication',
          reason: 'payment_pending',
          metadata: { order_id: 'order_custom' },
        },
      })
    )
    await expect(page.getByRole('button', { name: /Pay ₹599/ })).toBeDisabled()
    state.status = 'payable'
    await page.getByRole('button', { name: 'Check payment status' }).click()
    await expect(page.getByRole('button', { name: /Pay ₹599/ })).toBeEnabled()
    await page.getByRole('button', { name: /Pay ₹599/ }).click()
    assert.equal(requests.filter((r) => r.path.endsWith('/create-order')).length, 1)
    const calls = await page.evaluate(() => window.paymentFixture.calls)
    assert.equal(calls.length, 2)
    assert.ok(calls.every((call) => call.bank === 'HDFC' && call.orderId === 'order_custom'))
  } finally {
    await page.close()
  }
})

test('refresh restores the existing payment without creating another order', async () => {
  const { page, requests } = await checkoutPage('chromium', {}, { restored: true })
  try {
    await expect(page.getByRole('button', { name: /Show QR.*₹599/ })).toBeEnabled()
    await page.reload()
    await expect(page.getByRole('button', { name: /Show QR.*₹599/ })).toBeEnabled()
    assert.equal(requests.filter((r) => r.path.endsWith('/create-order')).length, 0)
    await expect(page.getByRole('button', { name: 'Edit', exact: true })).toHaveCount(0)
  } finally {
    await page.close()
  }
})

test('mobile UPI launches the selected app and the action fits the viewport', async () => {
  const { page } = await checkoutPage('webkit', {
    viewport: { width: 390, height: 844 },
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile Safari/604.1',
  })
  try {
    await page.getByRole('radio', { name: 'PhonePe' }).check()
    await page.getByRole('button', { name: 'Review payment', exact: true }).click()
    const pay = page.getByRole('button', { name: /Pay ₹599/ })
    await expect(pay).toBeEnabled()
    await screenshot(page, 'payment-mobile')
    const box = await pay.boundingBox()
    assert.ok(box.x >= 0 && box.x + box.width <= 390 && box.y + box.height <= 844)
    await pay.click()
    const call = (await page.evaluate(() => window.paymentFixture.calls))[0]
    assert.equal(call.app, 'phonepe')
    assert.equal(call.synchronous, true)
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
      false
    )
  } finally {
    await page.close()
  }
})

test('delivery and billing remain editable until Review payment, with accessible validation', async () => {
  const { page, requests } = await checkoutPage('chromium', {
    viewport: { width: 390, height: 844 },
  })
  try {
    await page.getByRole('button', { name: 'Edit', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Delivery address' })).toBeVisible()
    await expect(page.getByRole('radio', { name: /Express shipping/ })).toBeDisabled()
    await page.getByRole('checkbox', { name: 'Same as delivery address' }).uncheck()
    await page.getByRole('button', { name: 'Continue to payment', exact: true }).click()
    await expect(page.getByLabel('Billing name')).toBeFocused()
    await expect(page.getByLabel('Billing name')).toHaveAttribute('aria-invalid', 'true')
    await page.getByLabel('Billing name').fill('Aarohi Sen')
    await page.getByLabel('Billing address', { exact: true }).fill('24 Billing Lane')
    await page.getByLabel('Billing city').fill('Kolkata')
    await page.getByLabel('Billing PIN code').fill('700039')
    await screenshot(page, 'delivery-mobile')
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
      false
    )
    await page.getByRole('button', { name: 'Continue to payment', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Choose how you pay' })).toBeVisible()
    assert.equal(requests.filter((r) => r.path.endsWith('/create-order')).length, 0)
    await page.getByRole('button', { name: 'Review payment', exact: true }).click()
    const request = requests.find((r) => r.path.endsWith('/create-order'))
    assert.equal(request.body.billing_same_as_shipping, false)
    assert.equal(request.body.billing.address_line1, '24 Billing Lane')
    assert.ok(request.body.checkout_request_id)
  } finally {
    await page.close()
  }
})

test('duplicate SDK success callbacks verify once and reach the owned order outcome', async () => {
  const { page, requests } = await checkoutPage('chromium')
  try {
    await page.getByRole('button', { name: 'Review payment', exact: true }).click()
    await page.getByRole('button', { name: /Show QR.*₹599/ }).click()
    await page.evaluate(() => {
      const response = {
        razorpay_order_id: 'order_custom',
        razorpay_payment_id: 'pay_custom',
        razorpay_signature: 'test-signature',
      }
      window.paymentFixture.sdk.events['payment.success'](response)
      window.paymentFixture.sdk.events['payment.success'](response)
    })
    await expect(page).toHaveURL(/\/orders\/success\?orderId=fixture-order/)
    assert.equal(requests.filter((request) => request.path.endsWith('/verify')).length, 1)
  } finally {
    await page.close()
  }
})

test('an expired QR disappears and cannot launch another payment until status permits it', async () => {
  const { page, requests, state } = await checkoutPage('chromium')
  try {
    await page.getByRole('button', { name: 'Review payment', exact: true }).click()
    await page.getByRole('button', { name: /Show QR.*₹599/ }).click()
    await expect(page.getByRole('img', { name: /Scan.*UPI/i })).toBeVisible()
    state.status = 'pending'
    await page.evaluate(() =>
      window.paymentFixture.sdk.events['payment.upi.qr']({
        status: 'expired',
        expires_on: Date.now() - 1,
      })
    )
    await expect(page.getByRole('img', { name: /Scan.*UPI/i })).toHaveCount(0)
    await expect(page.getByRole('button', { name: /Show QR.*₹599/ })).toBeDisabled()
    assert.equal(requests.filter((request) => request.path.endsWith('/create-order')).length, 1)
    state.status = 'payable'
    await page.getByRole('button', { name: 'Check payment status' }).click()
    await expect(page.getByRole('button', { name: /Show QR.*₹599/ })).toBeEnabled()
  } finally {
    await page.close()
  }
})

test('unserviceable delivery and outages prevent review before any payment preparation', async () => {
  for (const behavior of [{ unserviceable: true }, { shippingOutage: true }]) {
    const { page, requests } = await checkoutPage(
      'chromium',
      { viewport: { width: 390, height: 844 } },
      behavior
    )
    try {
      await expect(page.getByRole('button', { name: 'Review payment', exact: true })).toBeDisabled()
      await expect(
        page.getByRole('alert').filter({
          hasText: behavior.shippingOutage
            ? 'Delivery availability could not be checked'
            : 'This delivery method is unavailable',
        })
      ).toBeVisible()
      assert.equal(
        requests.some((request) => request.path.endsWith('/create-order')),
        false
      )
      assert.ok(
        requests.some(
          (request) =>
            request.path.endsWith('/quote') && request.body.address_id === 'fixture-address'
        )
      )
    } finally {
      await page.close()
    }
  }
})

test('standard shipping with unknown estimate remains available and makes no date promise', async () => {
  const { page } = await checkoutPage('chromium', {}, { unknownEstimate: true })
  try {
    await page.getByRole('button', { name: 'Edit', exact: true }).click()
    await expect(page.getByText('Delivery estimate unavailable.', { exact: true })).toBeVisible()
    await expect(page.getByRole('radio', { name: /Standard shipping/ })).toBeEnabled()
    await expect(page.getByRole('radio', { name: /Express shipping/ })).toBeDisabled()
  } finally {
    await page.close()
  }
})

test('a stale payable poll cannot reopen Pay while success verification is pending', async () => {
  const { page, rawSession } = await checkoutPage('chromium')
  let statusRoute, verifyRoute
  let signalStatus, signalVerify
  const statusStarted = new Promise((resolve) => {
    signalStatus = resolve
  })
  const verifyStarted = new Promise((resolve) => {
    signalVerify = resolve
  })
  try {
    await page.getByRole('radio', { name: /Credit or debit card/ }).check()
    await page.getByLabel('Name on card').fill('Aarohi Sen')
    await page.getByLabel('Card number').fill('4100280000001007')
    await page.getByLabel('Expiry').fill('1030')
    await page.getByLabel('Security code').fill('123')
    await page.getByRole('button', { name: 'Review payment', exact: true }).click()
    await page.getByRole('button', { name: /Pay ₹599/ }).click()
    await page.route('**/api/checkout/fixture-order/reconcile', (route) => {
      statusRoute = route
      signalStatus()
    })
    await page.route('**/api/payments/verify', (route) => {
      verifyRoute = route
      signalVerify()
    })
    await page.getByRole('button', { name: 'Check payment status' }).click()
    await statusStarted
    await page.evaluate(() =>
      window.paymentFixture.sdk.events['payment.success']({
        razorpay_order_id: 'order_custom',
        razorpay_payment_id: 'pay_custom',
        razorpay_signature: 'test-signature',
      })
    )
    await verifyStarted
    await statusRoute.fulfill({ json: { success: true, data: rawSession() } })
    await page.evaluate(
      () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
    )
    await expect(page.getByRole('button', { name: /Pay ₹599/ })).toBeDisabled()
  } finally {
    if (verifyRoute)
      await verifyRoute
        .fulfill({ json: { success: true, data: { payment_status: 'paid' } } })
        .catch(() => {})
    await page.close()
  }
})
