const assert = require('node:assert/strict')
const { before, after, test } = require('node:test')
const { chromium, expect } = require('playwright/test')
let fixture, browser
before(async () => {
  fixture = await (await import('./fixtures/editorial-server.mjs')).startEditorialServer()
  browser = await chromium.launch()
})
after(async () => {
  await browser?.close()
  await fixture?.server.close()
})
async function visit(path, run, options = {}) {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 900 },
    reducedMotion: 'reduce',
    ...options,
  })
  page.setDefaultTimeout(5000)
  await page.route('**/*', (route) =>
    new URL(route.request().url()).origin === fixture.origin ? route.continue() : route.abort()
  )
  try {
    await page.goto(fixture.origin + path)
    await page.getByRole('heading', { name: 'Checkout', exact: true }).waitFor()
    await run(page)
  } finally {
    await page.close()
  }
}
test('signed-out checkout displays the local bag without requiring authentication', () =>
  visit('/checkout?fixtureRole=guest', async (page) => {
    await expect(page.getByRole('heading', { name: 'Order summary', exact: true })).toBeVisible()
    await expect(
      page.locator('.checkout-account').getByRole('button', { name: 'Sign in', exact: true })
    ).toBeVisible()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(page.locator('footer')).toHaveCount(0)
    await expect(page.locator('.stepper')).toHaveCount(0)
  }))
test('legacy cart and payment entries display every checkout section', () =>
  visit('/cart', async (page) => {
    assert.equal(new URL(page.url()).pathname, '/checkout')
    for (const name of ['Shipping information', 'Payment method', 'Promo code', 'Order total'])
      await expect(page.getByRole('heading', { name, exact: true })).toBeVisible()
    await page.goto(fixture.origin + '/checkout?step=payment')
    await expect(
      page.getByRole('heading', { name: 'Shipping information', exact: true })
    ).toBeVisible()
  }))
test('checkout stacks account, bag and forms with scrolling actions on narrow short screens', () =>
  visit(
    '/checkout',
    async (page) => {
      const top = (selector) =>
        page.locator(selector).evaluate((el) => el.getBoundingClientRect().top + scrollY)
      const positions = await Promise.all(
        [
          '.checkout-account',
          '.checkout-bag',
          '.checkout-shipping',
          '.checkout-payment',
          '.checkout-totals > section:first-child',
          '.checkout-promo',
          '.checkout-payment-outlet',
        ].map(top)
      )
      assert.deepEqual(
        [...positions].sort((a, b) => a - b),
        positions
      )
      assert.equal(
        await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
        false
      )
      await page
        .getByRole('link', { name: 'Continue shopping', exact: true })
        .scrollIntoViewIfNeeded()
      await expect(
        page.getByRole('link', { name: 'Continue shopping', exact: true })
      ).toBeInViewport()
      assert.equal(
        await page.locator('.checkout-action-bar').evaluate((el) => getComputedStyle(el).position),
        'static'
      )
    },
    { viewport: { width: 390, height: 500 } }
  ))

test('inline address save validates, preserves failures and selects the confirmed address', () =>
  visit('/checkout', async (page) => {
    await page.getByRole('button', { name: 'Add new address', exact: true }).click()
    await page.getByRole('button', { name: 'Save address', exact: true }).click()
    await expect(page.getByLabel('Street address', { exact: true })).toBeFocused()
    await page.getByLabel('Street address', { exact: true }).fill('45 New Lane')
    await page.getByLabel('City', { exact: true }).fill('Kolkata')
    await page.getByLabel('PIN code', { exact: true }).fill('700039')
    await page.evaluate(() => (window.fixture.saveAddressFailure = true))
    await page.getByRole('button', { name: 'Save address', exact: true }).click()
    await expect(
      page.getByRole('alert').filter({ hasText: 'Address could not be saved' })
    ).toBeVisible()
    await expect(page.getByLabel('Street address', { exact: true })).toHaveValue('45 New Lane')
    await page.evaluate(() => (window.fixture.saveAddressFailure = false))
    await page.getByRole('button', { name: 'Save address', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Select a delivery address' })).toContainText(
      'Aarohi Sen'
    )
    await expect(
      page.getByText('45 New Lane, Kolkata, West Bengal, 700039', { exact: true })
    ).toBeVisible()
    const calls = await page.evaluate(() => window.fixture.addressCalls)
    assert.equal(calls[0].account, 'fixture-user')
    await expect(page).toHaveURL(fixture.origin + '/checkout')
  }))

test('a late quote cannot overwrite newer quantities or restore old prices', () =>
  visit('/checkout', async (page) => {
    await expect(page.locator('.checkout-bag-item__price')).toHaveText('₹499')
    await page.evaluate(() => (window.fixture.quoteDelay = true))
    await page.getByRole('button', { name: 'Increase quantity', exact: true }).click()
    await page.waitForFunction(() => !!window.fixture.resolveQuote)
    await expect(page.locator('.checkout-bag-item__price')).toHaveText('—')
    await page.evaluate(() => (window.fixture.quoteDelay = false))
    await page.getByRole('button', { name: 'Increase quantity', exact: true }).click()
    await expect(page.locator('.checkout-bag-item__price')).toHaveText('₹1,497')
    await page.evaluate(() => window.fixture.resolveQuote())
    await expect(page.locator('.checkout-bag-item__price')).toHaveText('₹1,497')
  }))

test('an obsolete address save cannot populate another account workspace', () =>
  visit('/checkout', async (page) => {
    await page.getByRole('button', { name: 'Add new address', exact: true }).click()
    await page.getByLabel('Street address', { exact: true }).fill('Private old account lane')
    await page.getByLabel('City', { exact: true }).fill('Kolkata')
    await page.getByLabel('PIN code', { exact: true }).fill('700039')
    await page.evaluate(() => (window.fixture.gateAddress = true))
    await page.getByRole('button', { name: 'Save address', exact: true }).click()
    await page.waitForFunction(() => !!window.fixture.resolveAddress)
    await page.evaluate(() =>
      window.fixture.setAccount({
        ...window.fixture.auth.user,
        id: 'next-account',
        email: 'next@example.test',
      })
    )
    await expect(page.locator('.checkout-account')).toContainText('next@example.test')
    await page.evaluate(() => window.fixture.resolveAddress())
    await expect(page.locator('.checkout-shipping')).not.toContainText('Private old account lane')
  }))

test('empty bag stays on checkout and rejected promo codes retain an inline retry', () =>
  visit('/checkout', async (page) => {
    await page.getByRole('textbox', { name: 'Promo code', exact: true }).fill('INVALID')
    await page.getByRole('button', { name: 'Apply', exact: true }).click()
    await expect(page.locator('.checkout-promo').getByRole('alert')).toContainText('try again')
    await page.getByRole('button', { name: /^Remove / }).click()
    await expect(
      page.getByRole('heading', { name: 'Your bag is empty', exact: true })
    ).toBeVisible()
    await expect(page).toHaveURL(fixture.origin + '/checkout')
    await expect(page.getByRole('button', { name: 'Review payment', exact: true })).toBeDisabled()
  }))

test('address loading retries and the first saved address becomes default', () =>
  visit('/checkout', async (page) => {
    await page.evaluate(() => {
      window.fixture.addressFailure = true
      window.fixture.addresses = []
      window.fixture.setAccount({ ...window.fixture.auth.user, id: 'first-address-account' })
    })
    await expect(page.getByRole('button', { name: 'Retry addresses', exact: true })).toBeVisible()
    await page.evaluate(() => (window.fixture.addressFailure = false))
    await page.getByRole('button', { name: 'Retry addresses', exact: true }).click()
    await page.getByLabel('Street address', { exact: true }).fill('1 First Lane')
    await page.getByLabel('City', { exact: true }).fill('Kolkata')
    await page.getByLabel('PIN code', { exact: true }).fill('700039')
    await page.getByRole('button', { name: 'Save address', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Select a delivery address' })).toContainText(
      'Default'
    )
    assert.equal(await page.evaluate(() => window.fixture.addressCalls[0].value.isDefault), true)
  }))
