const assert = require('node:assert/strict')
const { test, before, after } = require('node:test')
const { join } = require('node:path')
const { pathToFileURL } = require('node:url')
const { mkdir } = require('node:fs/promises')
const { chromium } = require('playwright')
let server, browser, origin

before(async () => {
  const { startEditorialServer } = await import(
    pathToFileURL(join(__dirname, 'fixtures/editorial-server.mjs')).href
  )
  const started = await startEditorialServer({ defaultRole: 'admin' })
  server = started.server
  origin = started.origin
  browser = await chromium.launch({ headless: true })
})
after(async () => {
  await browser?.close()
  await server?.close()
})

async function fixture(path, run, viewport = { width: 1366, height: 900 }) {
  const page = await browser.newPage({ viewport, reducedMotion: 'reduce' })
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.route('**/*', (route) =>
    new URL(route.request().url()).origin === origin ? route.continue() : route.abort()
  )
  try {
    await page.goto(origin + path)
    await page.locator('h1').first().waitFor()
    await run(page)
    assert.deepEqual(errors, [])
  } finally {
    await page.close()
  }
}

test('admin theme includes overlays and toasts, collapses navigation and leaves storefront tokens intact', () =>
  fixture('/admin', async (page) => {
    await page.getByRole('heading', { name: 'Needs attention' }).waitFor({ timeout: 2000 })
    const admin = await page
      .locator('.admin-topbar')
      .evaluate((el) => getComputedStyle(el).getPropertyValue('--color-primary').trim())
    assert.equal(admin.toLowerCase(), '#6d4aff')
    await page.getByRole('button', { name: 'Collapse sidebar' }).click()
    assert.equal(await page.getByRole('button', { name: 'Expand sidebar' }).count(), 1)
    await page.getByRole('link', { name: 'Visit storefront' }).first().click()
    await page.locator('.storefront-shell').waitFor()
    const store = await page
      .locator('.storefront-shell')
      .evaluate((el) => getComputedStyle(el).getPropertyValue('--color-primary').trim())
    assert.equal(store.toLowerCase(), '#334b42')
  }))

test('catalog is list-first with URL filters, dedicated tabs and discard-safe dialogs', () =>
  fixture('/admin/catalog', async (page) => {
    assert.equal(await page.getByRole('textbox', { name: 'Product name', exact: true }).count(), 0)
    await page.getByRole('tab', { name: 'Products', exact: true }).waitFor({ timeout: 2000 })
    await page.getByRole('searchbox', { name: 'Search products' }).fill('Krishna')
    await page.getByRole('button', { name: 'Search', exact: true }).click()
    await page.waitForFunction(() => new URLSearchParams(location.search).get('q') === 'Krishna')
    await page.getByRole('button', { name: 'Clear product search' }).click()
    assert.equal(new URL(page.url()).searchParams.has('q'), false)
    await page.getByRole('button', { name: 'Add product', exact: true }).click()
    const dialog = page.getByRole('dialog', { name: 'Add product', exact: true })
    await dialog.getByRole('textbox', { name: 'Product name', exact: true }).fill('Unsaved product')
    await dialog.getByRole('button', { name: 'Close dialog' }).last().click()
    await page.getByRole('button', { name: 'Keep editing' }).click()
    assert.equal(
      await dialog.getByRole('textbox', { name: 'Product name', exact: true }).inputValue(),
      'Unsaved product'
    )
    await dialog.getByRole('button', { name: 'Close dialog' }).last().click()
    await page.getByRole('button', { name: 'Discard changes' }).click()
    await page.getByRole('tab', { name: 'Categories', exact: true }).click()
    await page.getByRole('button', { name: 'Add category', exact: true }).waitFor()
    assert.equal(new URL(page.url()).searchParams.get('tab'), 'categories')
    await page.reload()
    await page.getByRole('tab', { name: 'Categories', exact: true }).waitFor()
    assert.equal(
      await page
        .getByRole('tab', { name: 'Categories', exact: true })
        .getAttribute('aria-selected'),
      'true'
    )
  }))

test('orders restore URL filters and keep email search out of URLs across detail navigation', () =>
  fixture('/admin/orders?payment_status=paid&fulfillment_status=unfulfilled', async (page) => {
    await page
      .getByRole('button', { name: 'Payment status', exact: true })
      .waitFor({ timeout: 2000 })
    await page.getByRole('searchbox', { name: 'Order number or email' }).fill('aarohi@example.test')
    await page.getByRole('button', { name: 'Search', exact: true }).click()
    assert.equal(page.url().includes('aarohi'), false)
    await page.getByRole('link', { name: 'MUV-2026-1042', exact: true }).click()
    await page.getByRole('heading', { name: 'Order MUV-2026-1042', exact: true }).waitFor()
    await page.goBack()
    await page.getByRole('searchbox', { name: 'Order number or email' }).waitFor()
    assert.equal(
      await page.getByRole('searchbox', { name: 'Order number or email' }).inputValue(),
      'aarohi@example.test'
    )
    assert.equal(new URL(page.url()).searchParams.get('payment_status'), 'paid')
    await page.getByRole('button', { name: 'Clear order search' }).click()
    assert.equal(
      await page.getByRole('searchbox', { name: 'Order number or email' }).inputValue(),
      ''
    )
  }))

test('inventory deep links and coupon creation use focused workspaces', () =>
  fixture('/admin/catalog?tab=inventory&low_stock_only=true', async (page) => {
    await page.getByRole('tab', { name: 'Inventory', exact: true }).waitFor({ timeout: 2000 })
    await page.getByRole('checkbox', { name: 'Low stock only' }).waitFor()
    assert.equal(await page.getByRole('checkbox', { name: 'Low stock only' }).isChecked(), true)
    await page.getByRole('link', { name: 'Coupons', exact: true }).click()
    await page.getByRole('button', { name: 'Add coupon', exact: true }).click()
    await page.getByRole('dialog', { name: 'Add coupon', exact: true }).waitFor()
  }))

test('admin pages fit laptop, tablet, phone and enlarged text without document overflow', async () => {
  const output = join(__dirname, '../dev-scripts/admin-refresh')
  await mkdir(output, { recursive: true })
  for (const width of [1366, 1440, 820, 390, 320, 1280]) {
    for (const path of [
      '/admin',
      '/admin/orders',
      '/admin/orders/fixture-order',
      '/admin/catalog',
      '/admin/coupons',
      '/admin/settings',
      '/admin/failures',
    ]) {
      await fixture(
        path,
        async (page) => {
          if (width === 320 || width === 1280)
            await page.evaluate(() => (document.documentElement.style.fontSize = '32px'))
          await page.evaluate(() => document.fonts.ready)
          assert.equal(
            await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1),
            false,
            path + ' at ' + width
          )
          const name =
            path === '/admin' ? 'overview' : path.replace('/admin/', '').replaceAll('/', '-')
          await page.screenshot({ path: join(output, `${name}-${width}.png`), fullPage: true })
        },
        { width, height: 900 }
      )
    }
  }
})

test('inventory save failures preserve quantity, successful saves use the existing API and themed toast', () =>
  fixture('/admin/catalog?tab=inventory&allowAdminStock=1', async (page) => {
    const input = page.getByRole('spinbutton').first()
    await input.waitFor()
    await page.evaluate(() => (window.fixture.adminFailure = 'stock'))
    await input.fill('7')
    await page.getByRole('button', { name: 'Save', exact: true }).first().click()
    await page.getByRole('alert').filter({ hasText: 'Stock save failed' }).waitFor()
    assert.equal(await input.inputValue(), '7')
    await page.evaluate(() => (window.fixture.adminFailure = null))
    await page.getByRole('button', { name: 'Save', exact: true }).first().click()
    await page.waitForFunction(() => window.fixture.adminMutations.length === 2)
    await page.waitForFunction(() => window.fixture.details[0].stock === 7)
    assert.equal(await input.inputValue(), '7')
    const toast = page.locator('[aria-live=polite]').filter({ hasText: 'Stock updated for' })
    await toast.waitFor()
    assert.equal(
      (
        await toast.evaluate((el) =>
          getComputedStyle(el).getPropertyValue('--color-primary').trim()
        )
      ).toLowerCase(),
      '#6d4aff'
    )
  }))

test('overview sections fail and retry independently', () =>
  fixture('/admin', async (page) => {
    await page.evaluate(() => (window.fixture.adminFailure = 'inventory'))
    await page.getByRole('button', { name: 'Refresh overview' }).click()
    const inventory = page.getByRole('region', { name: 'Low-stock inventory', exact: true })
    await inventory.getByRole('alert').waitFor()
    await page.getByRole('link', { name: 'MUV-2026-1042', exact: true }).waitFor()
    assert.equal(await page.getByRole('heading', { name: 'Needs attention' }).count(), 1)
    await page.evaluate(() => (window.fixture.adminFailure = null))
    await inventory.getByRole('button', { name: 'Try again' }).click()
    await inventory.getByText('10 left', { exact: true }).first().waitFor()
    assert.equal(await inventory.getByRole('alert').count(), 0)
  }))

test('clearing product search ignores a late response and restores input focus', () =>
  fixture('/admin/catalog', async (page) => {
    const count = await page.evaluate(() => window.fixture.details.length)
    await page.evaluate(() => (window.fixture.delayedQuery = 'Krishna'))
    const input = page.getByRole('searchbox', { name: 'Search products' })
    await input.fill('Krishna')
    await page.getByRole('button', { name: 'Search', exact: true }).click()
    await page.waitForFunction(() => window.fixture.resolveProducts)
    await page.getByRole('button', { name: 'Clear product search' }).click()
    await page.getByRole('region', { name: 'Products', exact: true }).waitFor()
    await page.evaluate(() => window.fixture.resolveProducts())
    await page.evaluate(
      () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
    )
    assert.equal(await page.locator('.admin-table tbody tr').count(), count)
    assert.equal(await input.evaluate((el) => document.activeElement === el), true)
    assert.equal(new URL(page.url()).searchParams.has('q'), false)
  }))

test('mobile navigation and editor dialogs preserve keyboard access and admin theme', () =>
  fixture(
    '/admin/catalog',
    async (page) => {
      await page.getByRole('button', { name: 'Open admin navigation' }).click()
      const menu = page.getByRole('dialog', { name: 'Store management' })
      await menu.waitFor()
      assert.equal(
        (
          await menu.evaluate((el) =>
            getComputedStyle(el).getPropertyValue('--color-primary').trim()
          )
        ).toLowerCase(),
        '#6d4aff'
      )
      await page.keyboard.press('Escape')
      assert.equal(
        await page
          .getByRole('button', { name: 'Open admin navigation' })
          .evaluate((el) => el === document.activeElement),
        true
      )
      await page.getByRole('button', { name: 'Add product', exact: true }).click()
      const editor = page.getByRole('dialog', { name: 'Add product', exact: true })
      await editor.waitFor()
      assert.equal(
        (await editor.evaluate((el) => getComputedStyle(el).fontFamily)).includes('Manrope'),
        true
      )
      await page.keyboard.press('Escape')
      await editor.waitFor({ state: 'hidden' })
      await page.getByRole('button', { name: 'Add product', exact: true }).waitFor()
      await page.getByRole('tab', { name: 'Products', exact: true }).press('ArrowRight')
      await page.waitForFunction(
        () => new URLSearchParams(location.search).get('tab') === 'categories'
      )
      assert.equal(
        await page
          .getByRole('tab', { name: 'Categories', exact: true })
          .getAttribute('aria-selected'),
        'true'
      )
    },
    { width: 390, height: 844 }
  ))

test('enlarged order details retain usable content and input widths', () =>
  fixture(
    '/admin/orders/fixture-order',
    async (page) => {
      await page.evaluate(() => (document.documentElement.style.fontSize = '32px'))
      const items = page
        .locator('section')
        .filter({
          has: page.getByRole('heading', { name: 'Purchased items and totals', exact: true }),
        })
      await items.waitFor()
      assert.ok(
        (await items.boundingBox()).width >= 384,
        'Purchased items need a usable reading column'
      )
      assert.ok(
        (await page.getByLabel('Visible only to administrators').boundingBox()).width >= 240,
        'Order note input must remain usable'
      )
    },
    { width: 1280, height: 900 }
  ))
