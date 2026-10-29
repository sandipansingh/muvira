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
  await page.evaluate(() => {
    document.activeElement?.blur()
    scrollTo(0, 0)
  })
  await page.evaluate(() => new Promise(requestAnimationFrame))
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
    window.paymentFixture = { calls: [], events: [], ready: !settings.notReady, paid: false }
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
              card_networks: { VISA: 1, MC: 1, AMEX: 0 },
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
        if (settings.appsFailure) throw new Error('Discovery unavailable')
        if (settings.appsDelayed)
          return new Promise((resolve) => {
            window.paymentFixture.resolveApps = resolve
          })
        return settings.apps || ['phonepe', 'gpay']
      }
      emit(event) {
        window.paymentFixture.events.push(event)
        if (settings.cancelThrows) throw new Error('SDK cancellation failed')
        this.events['payment.error']?.({ error: { reason: 'payment_cancelled' } })
      }
      createPayment(data, options) {
        window.paymentFixture.calls.push({
          method: data.method,
          amount: data.amount,
          currency: data.currency,
          orderId: data.order_id,
          synchronous: window.event?.isTrusted === true,
          cardMatches: data['card[number]'] === '4100280000001007',
          bank: data.bank,
          wallet: data.wallet,
          app: options?.app,
          qrFallback: data.upi?.qr,
          qrTimeout: data.upi?.timeout,
          flow: options?.flow,
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
  let prepared = !!behavior.restored || !!behavior.oldPurchase
  let preparedRequestId = prepared ? '11111111-1111-4111-8111-111111111111' : null
  const state = { status: behavior.status || 'payable' }
  const session = () => ({
    checkout_request_id: preparedRequestId,
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
      if (url.pathname.includes('/requests/'))
        data = prepared && url.pathname.endsWith('/' + preparedRequestId) ? session() : null
      else if (url.pathname.endsWith('/attempts')) data = { attempt_id: body.checkout_request_id }
      else if (url.pathname.endsWith('/payment-config'))
        data = {
          key_id: 'rzp_test_example',
          currency: 'INR',
          mode: behavior.paymentMode ?? 'live',
          upi: {
            intent: behavior.intentEnabled ?? true,
            qr: behavior.qrEnabled ?? true,
            embedded_qr: behavior.embeddedQr ?? true,
          },
        }
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
        if (behavior.prepareFailure && !state.failedPrepare) {
          state.failedPrepare = true
          return route.fulfill({
            status: 503,
            json: {
              success: false,
              error: {
                code: 'SETUP_UNAVAILABLE',
                message: 'Payment preparation could not be confirmed.',
              },
            },
          })
        }
        if (behavior.gatedPrepare) await new Promise((resolve) => (state.releasePrepare = resolve))
        prepared = true
        preparedRequestId = body.checkout_request_id
        if (behavior.loseResponse && !state.lostResponse) {
          state.lostResponse = true
          return route.abort()
        }
        data = session()
      } else if (url.pathname.endsWith('/cancel')) {
        state.sdkEventsAtCancel = await page.evaluate(() => [...window.paymentFixture.events])
        if (behavior.gatedCancel) await new Promise((resolve) => (state.releaseCancel = resolve))
        if (behavior.cancelUncertain) {
          if (state.status !== 'paid') state.status = 'pending'
          return route.fulfill({
            status: 503,
            json: {
              success: false,
              error: {
                code: 'CANCELLATION_UNCERTAIN',
                message: 'Payment may still complete. Check its status before starting again.',
              },
            },
          })
        }
        state.status = 'released'
        data = null
      } else if (url.pathname.endsWith('/reconcile')) {
        if (behavior.reconcileFailure)
          return route.fulfill({
            status: 503,
            json: {
              success: false,
              error: {
                code: 'STATUS_UNAVAILABLE',
                message: 'Payment status unavailable. Please check again.',
              },
            },
          })
        data = session()
      } else if (url.pathname.endsWith('/verify')) {
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
  await page.goto(
    fixture.origin +
      '/checkout?step=payment' +
      (behavior.restored ? '&attempt=11111111-1111-4111-8111-111111111111' : '') +
      (behavior.cartCoupon ? '&cartCoupon=1' : '') +
      (behavior.emptyBag ? '&scenario=empty-cart' : '')
  )
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

test('Test Mode hides UPI and explains supported payment testing', async () => {
  const { page } = await checkoutPage('chromium', {}, { paymentMode: 'test' })
  try {
    await expect(page.getByText('Test checkout:', { exact: false })).toBeVisible()
    await expect(page.getByRole('radio', { name: 'UPI', exact: true })).toHaveCount(0)
    await expect(page.getByLabel('Card number', { exact: true })).toBeVisible()
    assert.equal(await page.evaluate(() => window.paymentFixture.calls.length), 0)
  } finally {
    await page.close()
  }
})

test('eligible desktop checkout redirects to QR unless embedded QR is approved', async () => {
  const { page } = await checkoutPage('chromium', {}, { embeddedQr: false })
  try {
    await page.getByRole('button', { name: 'Review payment', exact: true }).click()
    await expect(page.getByText(/Razorpay’s secure page/)).toBeVisible()
    await page.getByRole('button', { name: /Open QR payment.*₹599/ }).click()
    const calls = await page.evaluate(() => window.paymentFixture.calls)
    assert.equal(calls.length, 1)
    assert.equal(calls[0].qrFallback, true)
    assert.equal(calls[0].orderId, 'order_custom')
    assert.equal(calls[0].amount, 59900)
    assert.equal(calls[0].currency, 'INR')
    assert.equal(calls[0].qrTimeout, 10)
    assert.equal(calls[0].flow, undefined)
    await expect(page.getByRole('img', { name: /Scan.*UPI/i })).toHaveCount(0)
  } finally {
    await page.close()
  }
})

const phoneOptions = {
  viewport: { width: 390, height: 844 },
  userAgent: 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/130.0 Mobile Safari/537.36',
}

test('mobile UPI remains unavailable until supported apps are confirmed', async () => {
  const { page } = await checkoutPage('chromium', phoneOptions, { appsDelayed: true })
  try {
    await expect(page.getByRole('radio', { name: /Credit or debit card/ })).toBeVisible()
    await expect(page.getByRole('radio', { name: 'UPI', exact: true })).toHaveCount(0)
    await expect(page.getByText('Checking supported UPI apps…')).toBeVisible()
    await page.evaluate(() => window.paymentFixture.resolveApps(['gpay']))
    await page.getByRole('radio', { name: 'UPI', exact: true }).check()
    await expect(page.getByRole('radio', { name: 'Google Pay', exact: true })).toBeChecked()
    await expect(page.getByRole('radio', { name: 'PhonePe', exact: true })).toHaveCount(0)
  } finally {
    await page.close()
  }
})

for (const behavior of [{ appsFailure: true }, { apps: [] }, { appsDelayed: true }]) {
  test(`mobile discovery failure keeps other methods usable: ${JSON.stringify(behavior)}`, async () => {
    const { page } = await checkoutPage('webkit', phoneOptions, behavior)
    try {
      await expect(page.getByText(/UPI apps couldn’t be confirmed/)).toBeVisible({ timeout: 8000 })
      await expect(page.getByRole('radio', { name: 'UPI', exact: true })).toHaveCount(0)
      await expect(page.getByRole('button', { name: 'Review payment', exact: true })).toBeEnabled()
      await expect(page.getByRole('button', { name: 'Retry UPI apps', exact: true })).toBeEnabled()
      if (behavior.appsDelayed) {
        await page.evaluate(() => window.paymentFixture.resolveApps(['phonepe']))
        await expect(page.getByRole('radio', { name: 'UPI', exact: true })).toHaveCount(0)
      }
    } finally {
      await page.close()
    }
  })
}

for (const [options, behavior] of [
  [phoneOptions, { intentEnabled: false }],
  [phoneOptions, { methods: { card: true, upi: false } }],
  [{}, { qrEnabled: false }],
  [{}, { methods: { card: true, upi: false } }],
  [phoneOptions, { paymentMode: 'test' }],
]) {
  test(`UPI requires live mode, capability and provider availability: ${JSON.stringify(behavior)}`, async () => {
    const { page } = await checkoutPage('chromium', options, behavior)
    try {
      await expect(page.getByRole('radio', { name: /Credit or debit card/ })).toBeVisible()
      await expect(page.getByRole('radio', { name: 'UPI', exact: true })).toHaveCount(0)
    } finally {
      await page.close()
    }
  })
}

for (const cancelThrows of [false, true]) {
  test(`UPI SDK cancellation precedes backend cancellation and locks retries (SDK throws: ${cancelThrows})`, async () => {
    const { page, requests, state } = await checkoutPage('chromium', phoneOptions, {
      cancelThrows,
      cancelUncertain: true,
      gatedCancel: true,
    })
    try {
      await page.getByRole('button', { name: 'Review payment', exact: true }).click()
      const pay = page.getByRole('button', { name: /Pay ₹599/ })
      await pay.click()
      await page.getByRole('button', { name: 'Request cancellation', exact: true }).click()
      await expect.poll(() => !!state.releaseCancel).toBe(true)
      assert.deepEqual(state.sdkEventsAtCancel, ['payment.cancel'])
      await expect(pay).toBeDisabled()
      await expect(
        page.getByRole('button', { name: 'Request cancellation', exact: true })
      ).toBeDisabled()
      assert.equal(requests.filter((r) => r.path.endsWith('/reconcile')).length, 0)
      state.releaseCancel()
      await expect(page.getByRole('alert')).toContainText('Payment may still complete')
      await expect(pay).toBeDisabled()
      assert.equal((await page.evaluate(() => window.paymentFixture.calls)).length, 1)
    } finally {
      state.releaseCancel?.()
      await page.close()
    }
  })
}

test('cancellation stops the dispatched UPI attempt after a failed status check and method change', async () => {
  const { page, state } = await checkoutPage('chromium', phoneOptions, { reconcileFailure: true })
  try {
    await page.getByRole('button', { name: 'Review payment', exact: true }).click()
    await page.getByRole('button', { name: /Pay ₹599/ }).click()
    await page.getByRole('button', { name: 'Check payment status', exact: true }).click()
    await expect(page.getByRole('alert')).toContainText('Payment status unavailable')
    await page.getByRole('radio', { name: /Credit or debit card/ }).check()
    await page.getByRole('button', { name: 'Request cancellation', exact: true }).click()
    await expect.poll(() => state.sdkEventsAtCancel).toEqual(['payment.cancel'])
    await expect(page.getByRole('button', { name: /Pay ₹599/ })).toBeDisabled()
  } finally {
    await page.close()
  }
})

test('success arriving during cancellation verifies once and cannot reopen payment', async () => {
  const { page, requests, state } = await checkoutPage('chromium', phoneOptions, {
    cancelUncertain: true,
    gatedCancel: true,
  })
  try {
    await page.getByRole('button', { name: 'Review payment', exact: true }).click()
    const pay = page.getByRole('button', { name: /Pay ₹599/ })
    await pay.click()
    await page.getByRole('button', { name: 'Request cancellation', exact: true }).click()
    await expect.poll(() => !!state.releaseCancel).toBe(true)
    await page.evaluate(() => {
      const response = {
        razorpay_order_id: 'order_custom',
        razorpay_payment_id: 'pay_duringCancel',
        razorpay_signature: 'fixture',
      }
      window.paymentFixture.sdk.events['payment.success'](response)
      window.paymentFixture.sdk.events['payment.success'](response)
    })
    await expect.poll(() => state.status).toBe('paid')
    await expect(pay).toBeDisabled()
    assert.equal(requests.filter((r) => r.path.endsWith('/verify')).length, 1)
    state.releaseCancel()
    await expect(page).toHaveURL(/\/orders\/success\?orderId=fixture-order/)
    assert.equal(requests.filter((r) => r.path.endsWith('/create-order')).length, 1)
    assert.equal((await page.evaluate(() => window.paymentFixture.calls)).length, 1)
  } finally {
    state.releaseCancel?.()
    await page.close()
  }
})

test('flat SDK errors preserve order identity and activate redirect QR recovery', async () => {
  const { page, requests } = await checkoutPage('chromium')
  try {
    await page.getByRole('button', { name: 'Review payment', exact: true }).click()
    await page.getByRole('button', { name: /Show QR.*₹599/ }).click()
    await page.evaluate(() =>
      window.paymentFixture.sdk.events['payment.error']({
        code: 'BAD_REQUEST_ERROR',
        reason: 'Feature not enabled',
        description: 'UPI QR non-redirection flow not supported',
        metadata: { order_id: 'order_other' },
      })
    )
    await expect(page.getByRole('img', { name: /Scan.*UPI/i })).toBeVisible()
    assert.equal(requests.filter((r) => r.path.endsWith('/payment-error')).length, 0)
    await page.evaluate(() =>
      window.paymentFixture.sdk.events['payment.error']({
        code: 'BAD_REQUEST_ERROR',
        reason: 'Feature not enabled',
        description: 'UPI QR non-redirection flow not supported',
        metadata: { order_id: 'order_custom' },
      })
    )
    const retry = page.getByRole('button', { name: /Open QR payment.*₹599/ })
    await expect(retry).toBeEnabled()
    await retry.click()
    const calls = await page.evaluate(() => window.paymentFixture.calls)
    assert.equal(calls.length, 2)
    assert.equal(calls[1].orderId, 'order_custom')
    assert.equal(calls[1].qrFallback, true)
    assert.equal(calls[1].flow, undefined)
  } finally {
    await page.close()
  }
})

test('mobile app failure reconciles before retry and ignores callbacks from the previous SDK', async () => {
  const { page, requests } = await checkoutPage('chromium', phoneOptions)
  try {
    await page.getByRole('button', { name: 'Review payment', exact: true }).click()
    const pay = page.getByRole('button', { name: /Pay ₹599/ })
    await pay.click()
    await page.evaluate(() => {
      window.previousSdk = window.paymentFixture.sdk
      window.previousSdk.events['payment.error']({
        reason: 'intent_no_apps_error',
        code: 'BAD_REQUEST_ERROR',
      })
    })
    await expect(page.getByRole('alert')).toContainText('could not open')
    await expect(pay).toBeEnabled()
    await page.getByRole('radio', { name: 'Google Pay', exact: true }).check()
    await page.evaluate(() =>
      window.previousSdk.events['payment.success']({
        razorpay_order_id: 'order_custom',
        razorpay_payment_id: 'pay_stale',
        razorpay_signature: 'stale',
      })
    )
    assert.equal(requests.filter((r) => r.path.endsWith('/verify')).length, 0)
    await pay.click()
    const calls = await page.evaluate(() => window.paymentFixture.calls)
    assert.equal(calls.length, 2)
    assert.equal(calls[1].app, 'gpay')
    assert.equal(calls[1].currency, 'INR')
    assert.equal(calls[1].orderId, 'order_custom')
    assert.equal(requests.filter((r) => r.path.endsWith('/create-order')).length, 1)
    const diagnostic = requests.find((r) => r.path.endsWith('/payment-error'))
    assert.equal(diagnostic.body.reason, 'intent_no_apps_error')
    assert.equal(diagnostic.body.flow, 'intent')
  } finally {
    await page.close()
  }
})

test('returning from a UPI app reconciles payment without another SDK dispatch', async () => {
  const { page, requests, state } = await checkoutPage('webkit', phoneOptions)
  try {
    await page.getByRole('button', { name: 'Review payment', exact: true }).click()
    await page.getByRole('button', { name: /Pay ₹599/ }).click()
    state.status = 'paid'
    await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')))
    await expect(page).toHaveURL(/\/orders\/success\?orderId=fixture-order/)
    assert.equal(requests.filter((r) => r.path.endsWith('/create-order')).length, 1)
    assert.equal((await page.evaluate(() => window.paymentFixture.calls)).length, 1)
  } finally {
    await page.close()
  }
})

for (const engine of ['chromium', 'webkit']) {
  test(`${engine}: wallet submission retains the authoritative order and uses the selected provider`, async () => {
    const { page } = await checkoutPage(engine)
    try {
      await page.getByRole('radio', { name: 'Wallet', exact: true }).check()
      await page.getByRole('button', { name: 'Choose your wallet', exact: true }).click()
      await page.getByRole('menuitem', { name: 'PayZapp', exact: true }).click()
      await page.getByRole('button', { name: 'Review payment', exact: true }).click()
      await page.getByRole('button', { name: /Pay ₹599/ }).click()
      const [call] = await page.evaluate(() => window.paymentFixture.calls)
      assert.equal(call.method, 'wallet')
      assert.equal(call.wallet, 'payzapp')
      assert.equal(call.amount, 59900)
      assert.equal(call.currency, 'INR')
      assert.equal(call.orderId, 'order_custom')
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
    await pay.scrollIntoViewIfNeeded()
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
    await expect(page.getByRole('heading', { name: 'Delivery address' })).toBeVisible()
    await expect(page.getByRole('radio', { name: /Express shipping/ })).toHaveCount(0)
    await page.getByRole('checkbox', { name: 'Same as delivery address' }).uncheck()
    await page.getByRole('button', { name: 'Review payment', exact: true }).click()
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
    await expect(page.getByRole('heading', { name: 'Payment method' })).toBeVisible()
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
    await expect(page.getByText('Delivery estimate unavailable.', { exact: true })).toBeVisible()
    await expect(page.getByRole('radio', { name: /Standard shipping/ })).toBeEnabled()
    await expect(page.getByRole('radio', { name: /Express shipping/ })).toHaveCount(0)
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

for (const engine of ['chromium', 'webkit']) {
  test(`${engine}: expanded payment panels keep bank choices reachable and clear abandoned card inputs`, async () => {
    for (const [width, scale] of [
      [1280, 1],
      [320, 2],
    ]) {
      const { page } = await checkoutPage(
        engine,
        { viewport: { width, height: 950 } },
        {
          methods: {
            card: true,
            wallet: { payzapp: true },
            netbanking: Object.fromEntries(
              Array.from({ length: 12 }, (_, i) => [`BANK${i}`, `Bank ${i}`])
            ),
          },
        }
      )
      await page.evaluate(
        (scale) => (document.documentElement.style.fontSize = `${16 * scale}px`),
        scale
      )
      try {
        await page.getByRole('radio', { name: /Credit or debit card/ }).check()
        await page.getByLabel('Card number', { exact: true }).fill('4100 2800 0000 1007')
        await page.getByRole('radio', { name: /Netbanking/ }).check()
        await page.getByRole('button', { name: 'Choose your bank', exact: true }).click()
        const menu = await page.getByRole('menu').boundingBox()
        assert.ok(menu.x >= 0 && menu.x + menu.width <= width, `Bank choices must fit ${width}px`)
        await page.getByRole('menuitem', { name: 'Bank 11', exact: true }).click()
        await expect(
          page.getByRole('button', { name: 'Choose your bank', exact: true })
        ).toContainText('Bank 11')
        await page.getByRole('radio', { name: /Wallet/ }).check()
        await page.getByRole('button', { name: 'Choose your wallet', exact: true }).click()
        const walletMenu = await page.getByRole('menu').boundingBox()
        assert.ok(
          walletMenu.x >= 0 && walletMenu.x + walletMenu.width <= width,
          `Wallet choices must fit ${width}px`
        )
        await page.getByRole('menuitem', { name: 'PayZapp', exact: true }).click()
        await page.getByRole('radio', { name: /Credit or debit card/ }).check()
        await expect(page.getByLabel('Card number', { exact: true })).toHaveValue('')
      } finally {
        await page.close()
      }
    }
  })
  test(`${engine}: payment panels and actions reflow at every review width and enlarged text`, async () => {
    for (const width of [320, 390, 768, 1280, 1440]) {
      const { page } = await checkoutPage(engine, { viewport: { width, height: 950 } })
      try {
        await page.getByRole('radio', { name: /Credit or debit card/ }).check()
        await page.getByLabel('Card number', { exact: true }).waitFor()
        for (const scale of [1, 2]) {
          await page.evaluate(
            (scale) => (document.documentElement.style.fontSize = `${16 * scale}px`),
            scale
          )
          await page.evaluate(
            () => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)))
          )
          if (scale === 2) {
            await page.evaluate(() => document.fonts.ready)
            await page.getByLabel('Expiry', { exact: true }).fill('12/30')
            await expect(page.locator('.checkout-bag-item__title').first()).toHaveCSS(
              'font-size',
              '28px'
            )
            const readable = await page.evaluate(() => {
              const selectors = ['.checkout-bag-item__details', '.checkout-shipping']
              return selectors.map((selector) => {
                const element = document.querySelector(selector)
                const text = element.querySelector('.checkout-bag-item__title, p')
                const style = getComputedStyle(text)
                const context = document.createElement('canvas').getContext('2d')
                context.font = [style.fontWeight, style.fontSize, style.fontFamily].join(' ')
                const longestWord = Math.max(
                  ...text.textContent.split(/\s+/).map((word) => context.measureText(word).width)
                )
                return { selector, width: element.clientWidth, longestWord }
              })
            })
            for (const item of readable)
              assert.ok(
                item.width >= item.longestWord,
                `${width}px enlarged ${JSON.stringify(item)}`
              )
            assert.equal(
              await page.getByLabel('Expiry', { exact: true }).evaluate((input) => {
                const style = getComputedStyle(input),
                  canvas = document.createElement('canvas'),
                  context = canvas.getContext('2d')
                context.font = [style.fontWeight, style.fontSize, style.fontFamily].join(' ')
                return (
                  input.clientWidth >=
                  context.measureText(input.value).width +
                    parseFloat(style.paddingLeft) +
                    parseFloat(style.paddingRight)
                )
              }),
              true,
              `Expiry must remain readable at ${width}px enlarged text`
            )
          }
          assert.equal(
            await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
            true,
            `${engine} ${width}px scale${scale}`
          )
          await screenshot(page, `${engine}-${width}-card-text${scale}`)
        }
      } finally {
        await page.close()
      }
    }
  })
}

test('restored payment never presents a later bag coupon as part of its frozen order', async () => {
  const { page } = await checkoutPage('chromium', {}, { restored: true, cartCoupon: true })
  try {
    await expect(page.getByText('Prepared order item', { exact: true })).toBeVisible()
    await expect(page.getByText('LATER-CODE applied', { exact: true })).toHaveCount(0)
  } finally {
    await page.close()
  }
})

test('payment artwork only names provider-confirmed networks and apps, with natural card field order', async () => {
  const { page } = await checkoutPage('chromium')
  try {
    await page.getByRole('radio', { name: /Credit or debit card/ }).check()
    const card = page
      .locator('.checkout-method-panel')
      .filter({ has: page.getByRole('radio', { name: /Credit or debit card/ }) })
    await expect(card.getByRole('img', { name: 'Visa', exact: true })).toBeVisible()
    await expect(card.getByRole('img', { name: 'Mastercard', exact: true })).toBeVisible()
    await expect(card.getByRole('img', { name: 'American Express', exact: true })).toHaveCount(0)
    assert.deepEqual(
      await page
        .locator('.checkout-card-fields input')
        .evaluateAll((fields) => fields.map((field) => field.name)),
      ['number', 'expiry', 'securityCode', 'name']
    )
  } finally {
    await page.close()
  }
  const unknown = await checkoutPage(
    'chromium',
    {},
    { methods: { card: true, card_networks: { VISA: 0, MC: 0, UNKNOWN: 1 } } }
  )
  try {
    await expect(unknown.page.locator('.payment-artwork img')).toHaveCount(0)
    await expect(unknown.page.locator('.payment-artwork__generic')).toBeVisible()
  } finally {
    await unknown.page.close()
  }
  const mobile = await checkoutPage(
    'webkit',
    {
      viewport: { width: 390, height: 844 },
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
    },
    { apps: ['phonepe'] }
  )
  try {
    await expect(mobile.page.locator('.checkout-app img[alt=""]')).toHaveCount(1)
    await expect(mobile.page.locator('img[src$="google-pay.svg"]')).toHaveCount(0)
    await expect(mobile.page.getByRole('radio', { name: 'PhonePe', exact: true })).toBeVisible()
  } finally {
    await mobile.page.close()
  }
})

test('cancellation only offers a fresh checkout after confirmed release; uncertain cancellation stays recoverable', async () => {
  for (const uncertain of [false, true]) {
    const { page, requests } = await checkoutPage(
      'chromium',
      {},
      { restored: true, cancelUncertain: uncertain }
    )
    try {
      await page.getByRole('button', { name: 'Request cancellation', exact: true }).click()
      if (uncertain) {
        await expect(page.getByRole('alert')).toContainText('Payment may still complete')
        await expect(page.getByRole('button', { name: 'Edit checkout', exact: true })).toHaveCount(
          0
        )
        await page.getByRole('button', { name: 'Check payment status', exact: true }).click()
        await expect(page.getByRole('button', { name: /Show QR/ })).toBeDisabled()
      } else {
        await expect(page.getByRole('button', { name: 'Edit checkout', exact: true })).toBeEnabled()
      }
      assert.equal(requests.filter((request) => request.path.endsWith('/cancel')).length, 1)
      assert.equal(requests.filter((request) => request.path.endsWith('/create-order')).length, 0)
      assert.equal(await page.evaluate(() => window.paymentFixture.calls.length), 0)
    } finally {
      await page.close()
    }
  }
})

test('preparation immediately locks bag, address and coupon edits while preserving the payment form', async () => {
  const { page, requests, state } = await checkoutPage('chromium', {}, { gatedPrepare: true })
  try {
    const formId = await page.locator('.checkout-payment form').getAttribute('id')
    await page.getByRole('button', { name: 'Review payment', exact: true }).click()
    await expect.poll(() => requests.filter((r) => r.path.endsWith('/create-order')).length).toBe(1)
    await expect(page.getByRole('button', { name: 'Increase quantity' })).toBeDisabled()
    await expect(page.getByRole('button', { name: 'Add new address' })).toBeDisabled()
    await expect(page.getByRole('textbox', { name: 'Promo code', exact: true })).toBeDisabled()
    state.releasePrepare()
    const pay = page.getByRole('button', { name: /Show QR.*₹599/ })
    await expect(pay).toBeEnabled()
    assert.equal(await pay.getAttribute('form'), formId)
    assert.equal(await page.locator('.checkout-payment form').getAttribute('id'), formId)
    await expect(page.getByRole('button', { name: 'Increase quantity' })).toHaveCount(0)
  } finally {
    await page.close()
  }
})

test('an existing session recovers with an empty live bag using its frozen items', async () => {
  const { page, requests } = await checkoutPage('chromium', {}, { restored: true, emptyBag: true })
  try {
    await expect(page.getByText('Prepared order item', { exact: true })).toBeVisible()
    await expect(page.locator('.checkout-bag a[href="/product/test-product"]')).toHaveCount(0)
    await expect(page.getByRole('heading', { name: 'Your bag is empty' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: /Show QR.*₹599/ })).toBeEnabled()
    assert.equal(requests.filter((r) => r.path.endsWith('/create-order')).length, 0)
  } finally {
    await page.close()
  }
})

test('confirmed cancellation clears a live QR and immediately permits a new review', async () => {
  const { page, requests } = await checkoutPage('chromium')
  try {
    await page.getByRole('button', { name: 'Review payment', exact: true }).click()
    await page.getByRole('button', { name: /Show QR.*₹599/ }).click()
    await expect(page.getByRole('img', { name: /Scan.*UPI/i })).toBeVisible()
    await page.getByRole('button', { name: 'Request cancellation', exact: true }).click()
    await page.getByRole('button', { name: 'Edit checkout', exact: true }).click()
    await expect(page.getByRole('img', { name: /Scan.*UPI/i })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Review payment', exact: true })).toBeEnabled()
    await page.getByRole('button', { name: 'Review payment', exact: true }).click()
    await expect.poll(() => requests.filter((r) => r.path.endsWith('/create-order')).length).toBe(2)
  } finally {
    await page.close()
  }
})

for (const status of ['payable', 'pending', 'review', 'preparing']) {
  test(`an older ${status} purchase cannot interrupt a fresh checkout`, async () => {
    const { page, requests } = await checkoutPage('chromium', {}, { oldPurchase: true, status })
    try {
      await expect(page.getByRole('button', { name: 'Review payment', exact: true })).toBeEnabled()
      await expect(
        page.getByRole('button', { name: 'Increase quantity', exact: true })
      ).toBeEnabled()
      assert.equal(requests.filter((r) => r.path.endsWith('/active')).length, 0)
      assert.equal(requests.filter((r) => r.path.endsWith('/create-order')).length, 0)
    } finally {
      await page.close()
    }
  })
}

test('a lost preparation response recovers the same attempt and reload never prepares another order', async () => {
  const { page, requests } = await checkoutPage('chromium', {}, { loseResponse: true })
  try {
    await page.getByRole('button', { name: 'Review payment', exact: true }).click()
    await expect(page.getByRole('button', { name: /Show QR.*₹599/ })).toBeEnabled()
    const id = new URL(page.url()).searchParams.get('attempt')
    assert.ok(id)
    assert.equal(
      requests.find((r) => r.path.endsWith('/create-order')).body.checkout_request_id,
      id
    )
    await page.reload()
    await expect(page.getByRole('button', { name: /Show QR.*₹599/ })).toBeEnabled()
    assert.equal(requests.filter((r) => r.path.endsWith('/create-order')).length, 1)
  } finally {
    await page.close()
  }
})

test('preparation retry keeps its original UUID and only Start new order replaces it', async () => {
  for (const startNew of [false, true]) {
    const { page, requests } = await checkoutPage('chromium', {}, { prepareFailure: true })
    try {
      await page.getByRole('button', { name: 'Review payment', exact: true }).click()
      await expect(page.getByRole('button', { name: 'Retry', exact: true })).toBeVisible()
      const original = requests.find((r) => r.path.endsWith('/create-order')).body
        .checkout_request_id
      if (startNew) {
        await page.getByRole('button', { name: 'Start new order', exact: true }).click()
        await expect(
          page.getByRole('button', { name: 'Review payment', exact: true })
        ).toBeEnabled()
        await page.getByRole('button', { name: 'Review payment', exact: true }).click()
      } else await page.getByRole('button', { name: 'Retry', exact: true }).click()
      await expect(page.getByRole('button', { name: /Show QR.*₹599/ })).toBeEnabled()
      const submissions = requests.filter((r) => r.path.endsWith('/create-order'))
      assert.equal(submissions.length, 2)
      assert.equal(submissions[1].body.checkout_request_id === original, !startNew)
    } finally {
      await page.close()
    }
  }
})
