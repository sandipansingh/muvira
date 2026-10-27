const assert = require('node:assert/strict')
const { before, after, test } = require('node:test')
const { chromium } = require('playwright')
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
async function pageFor(path, run) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  page.setDefaultTimeout(5000)
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.route('**/*', (route) => {
    const url = new URL(route.request().url())
    if (url.origin === fixture.origin) return route.continue()
    if (route.request().resourceType() === 'image')
      return route.fulfill({
        path: 'client/public/images/editorial/stone-alcove.png',
        contentType: 'image/png',
      })
    return route.abort()
  })
  try {
    await page.goto(fixture.origin + path)
    await page.waitForFunction(() => window.fixtureReady)
    await run(page)
    assert.deepEqual(errors, [])
  } finally {
    await page.close()
  }
}
test('collections navigation exposes real links and restores keyboard focus', () =>
  pageFor('/', async (page) => {
    const trigger = page.getByRole('button', { name: 'Collections', exact: true })
    await trigger.click()
    const menu = page.getByRole('menu')
    await menu.waitFor()
    assert.match(
      await menu.getByRole('menuitem').first().getAttribute('href'),
      /^\/categories$|^\/shop\?category=/
    )
    await page.keyboard.press('ArrowDown')
    assert.equal(await menu.evaluate((el) => el.contains(document.activeElement)), true)
    await page.keyboard.press('Escape')
    assert.equal(await trigger.evaluate((el) => document.activeElement === el), true)
  }))
test('missing legacy hero category destinations lead to the shop', () =>
  pageFor('/', async (page) => {
    await page.getByRole('heading', { name: 'Ganesha Idols', exact: true }).waitFor()
    assert.equal(
      await page
        .getByRole('link', { name: 'Explore the collection', exact: true })
        .getAttribute('href'),
      '/shop'
    )
  }))
test('lightbox supports image navigation, 2x zoom, pan and focus restoration', () =>
  pageFor('/product/fixture', async (page) => {
    const trigger = page.getByRole('button', { name: /^Enlarge image of/ })
    await trigger.click()
    const dialog = page.getByRole('dialog')
    await dialog.waitFor()
    const first = await dialog.locator('[data-lightbox-image]').getAttribute('src')
    await dialog.getByRole('button', { name: 'Next image', exact: true }).click()
    assert.notEqual(await dialog.locator('[data-lightbox-image]').getAttribute('src'), first)
    await dialog.getByRole('button', { name: 'Zoom to 2×', exact: true }).click()
    await dialog.getByRole('button', { name: 'Pan right', exact: true }).click()
    assert.equal(await dialog.locator('[data-lightbox-image]').getAttribute('data-zoom'), '2')
    await dialog.getByRole('button', { name: 'Reset view', exact: true }).click()
    assert.equal(await dialog.locator('[data-lightbox-image]').getAttribute('data-zoom'), '1')
    await page.keyboard.press('ArrowLeft')
    assert.equal(await dialog.locator('[data-lightbox-image]').getAttribute('src'), first)
    await page.keyboard.press('Escape')
    assert.equal(await trigger.evaluate((el) => document.activeElement === el), true)
  }))
test('unconfigured hero offers a working catalog link and configured hero uses manual navigation', () =>
  pageFor('/?scenario=unconfigured', async (page) => {
    await page.getByRole('heading', { level: 1, name: 'For your everyday devotion.' }).waitFor()
    await page.getByRole('link', { name: 'Explore the collection', exact: true }).click()
    assert.equal(new URL(page.url()).pathname, '/shop')
    await page.goto(fixture.origin)
    await page.getByRole('heading', { level: 1, name: 'Ganesha Idols' }).waitFor()
    await page.getByRole('button', { name: 'Next slide', exact: true }).click()
    await page.getByRole('heading', { level: 1, name: 'Jaggarnath Idol' }).waitFor()
    await page.waitForTimeout(6200)
    assert.equal(await page.getByRole('heading', { level: 1 }).innerText(), 'Jaggarnath Idol')
  }))
test('search dialog traps keyboard focus and restores the trigger on Escape', () =>
  pageFor('/', async (page) => {
    const trigger = page.getByRole('button', { name: 'Search products', exact: true })
    await trigger.click()
    const dialog = page.getByRole('dialog', { name: 'Find something meaningful' })
    await dialog.waitFor()
    await page.waitForFunction(() => document.activeElement?.matches('[data-dialog-initial-focus]'))
    assert.equal(
      await page.getByRole('searchbox').evaluate((el) => document.activeElement === el),
      true
    )
    await page.getByRole('searchbox').fill('Krishna')
    for (let index = 0; index < 6; index++) {
      await page.keyboard.press('Tab')
      assert.equal(await dialog.evaluate((el) => el.contains(document.activeElement)), true)
    }
    await page.keyboard.press('Escape')
    assert.equal(await trigger.evaluate((el) => document.activeElement === el), true)
  }))
test('loading merchandise grids reflow at mobile and tablet widths', () =>
  pageFor('/?scenario=loading', async (page) => {
    await page.getByText('Loading store highlights…').waitFor()
    for (const width of [390, 820]) {
      await page.setViewportSize({ width, height: 900 })
      assert.equal(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
        true
      )
    }
  }))
test('coupon editor uses a labeled dialog and preserves values when saving fails', () =>
  pageFor('/admin/coupons?fixtureRole=admin', async (page) => {
    const trigger = page.getByRole('button', { name: 'Edit', exact: true }).first()
    await trigger.click()
    const dialog = page.getByRole('dialog', { name: 'Edit DEVOTION10' })
    await dialog.waitFor({ timeout: 3000 })
    await dialog.getByLabel('Discount percentage').fill('15')
    await dialog.getByRole('button', { name: 'Save coupon' }).click()
    await dialog.getByRole('alert').waitFor()
    assert.equal(await dialog.getByLabel('Discount percentage').inputValue(), '15')
    await page.keyboard.press('Escape')
    assert.equal(await trigger.evaluate((el) => document.activeElement === el), true)
  }))
test('admin catalog shows the selling price instead of the comparison price', () =>
  pageFor('/admin/catalog?fixtureRole=admin', async (page) => {
    const firstProduct = page.locator('tbody tr').first()
    await firstProduct.waitFor()
    assert.equal(await firstProduct.locator('td').nth(1).innerText(), '₹499')
  }))
test('out of stock product cards cannot add merchandise', () =>
  pageFor('/shop?stock=0', async (page) => {
    const buttons = page.getByRole('button', { name: /^Add .* to cart$/ })
    await buttons.first().waitFor()
    for (const button of await buttons.all()) assert.equal(await button.isDisabled(), true)
  }))
test('protected pages render for authenticated fixtures and redirect guest access', () =>
  pageFor('/admin?fixtureRole=admin', async (page) => {
    await page.getByRole('heading', { level: 1, name: 'Operations overview' }).waitFor()
    await page.goto(fixture.origin + '/profile')
    await page.getByRole('heading', { level: 1, name: 'My Profile' }).waitFor()
    await page.goto(fixture.origin + '/admin?fixtureRole=guest')
    await page.getByRole('heading', { level: 1, name: 'Welcome back.' }).waitFor()
    assert.equal(new URL(page.url()).pathname, '/signin')
  }))
test('pending payments get a distinct recovery screen without claiming payment success', () =>
  pageFor('/orders/success?orderId=fixture-order&payment=pending', async (page) => {
    await page
      .getByRole('heading', { name: 'Payment is being confirmed', exact: true })
      .waitFor({ timeout: 3000 })
    assert.equal(await page.getByText('Payment verified', { exact: true }).count(), 0)
    assert.equal(
      await page.getByRole('link', { name: 'View order status', exact: true }).getAttribute('href'),
      '/orders/fixture-order'
    )
  }))
