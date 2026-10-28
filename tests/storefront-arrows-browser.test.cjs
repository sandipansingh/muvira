const assert = require('node:assert/strict')
const { before, after, test } = require('node:test')
const { chromium, expect } = require('playwright/test')
let browser, fixture
before(async () => {
  const { startEditorialServer } = await import('./fixtures/editorial-server.mjs')
  fixture = await startEditorialServer()
  browser = await chromium.launch({ headless: true })
})
after(async () => {
  await browser?.close()
  await fixture?.server.close()
})
async function visit(path, run) {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 900 },
    reducedMotion: 'reduce',
  })
  await page.route('**/*', (route) =>
    new URL(route.request().url()).origin === fixture.origin ? route.continue() : route.abort()
  )
  try {
    await page.goto(fixture.origin + path)
    await page.locator('h1').first().waitFor()
    await run(page)
  } finally {
    await page.close()
  }
}
for (const path of [
  '/',
  '/categories',
  '/shop',
  '/cart',
  '/cart?scenario=empty-cart',
  '/orders',
  '/orders/success?orderId=fixture-order',
  '/orders/failure',
])
  test(`${path} uses text-only destination links`, () =>
    visit(path, async (page) => {
      assert.equal(
        await page
          .locator(
            '.storefront-shell a svg.lucide-arrow-right, .storefront-shell a svg.lucide-arrow-up-right'
          )
          .count(),
        0
      )
    }))
test('order cards have an explicit View order label', () =>
  visit('/orders', async (page) => {
    const order = page.locator('a[href="/orders/fixture-order"]')
    await expect(order.getByText('View order', { exact: true })).toBeVisible()
    assert.equal(await order.locator('svg.lucide-chevron-right').count(), 0)
  }))
test('mobile search retains a visible label and functional submission without its arrow', () =>
  visit('/shop', async (page) => {
    await page.setViewportSize({ width: 390, height: 844 })
    const submit = page.getByRole('button', { name: 'Submit product search', exact: true })
    await expect(submit.getByText('Search', { exact: true })).toBeVisible()
    assert.equal(await submit.locator('svg').count(), 0)
    const box = await submit.boundingBox()
    assert.ok(box.width >= 44 && box.height >= 44)
    await page
      .getByRole('searchbox', { name: 'Search products and collections', exact: true })
      .fill('brass')
    await submit.click()
    await expect(page).toHaveURL(fixture.origin + '/search?q=brass')
  }))
test('hero navigation and collection disclosure retain their functional chevrons', () =>
  visit('/', async (page) => {
    const next = page.getByRole('button', { name: 'Next slide', exact: true })
    assert.equal(await next.locator('svg.lucide-chevron-right').count(), 1)
    const before = await page.locator('h1').textContent()
    await next.click()
    await expect(page.locator('h1')).not.toHaveText(before)
    const collections = page.getByRole('button', { name: 'Collections', exact: true })
    assert.equal(await collections.locator('svg.lucide-chevron-down').count(), 1)
    await collections.focus()
    await page.keyboard.press('ArrowDown')
    await expect(page.getByRole('menu')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(collections).toBeFocused()
  }))
