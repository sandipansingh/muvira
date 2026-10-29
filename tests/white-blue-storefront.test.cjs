const assert = require('node:assert/strict')
const { before, after, test } = require('node:test')
const { chromium, webkit, expect } = require('playwright/test')
let fixture
const browsers = {}
before(async () => {
  fixture = await (
    await import('./fixtures/editorial-server.mjs')
  ).startEditorialServer({ defaultRole: 'admin' })
  browsers.chromium = await chromium.launch()
  browsers.webkit = await webkit.launch()
})
after(async () => {
  await Promise.all(Object.values(browsers).map((browser) => browser.close()))
  await fixture?.server.close()
})
async function visit(engine, path, run) {
  const page = await browsers[engine].newPage({
    viewport: { width: 1440, height: 900 },
    reducedMotion: 'reduce',
  })
  await page.route('**/*', (route) =>
    new URL(route.request().url()).origin === fixture.origin ? route.continue() : route.abort()
  )
  try {
    await page.goto(fixture.origin + path)
    await page.locator('main h1').first().waitFor()
    await page.evaluate(() => document.fonts.ready)
    await run(page)
  } finally {
    await page.close()
  }
}
for (const engine of ['chromium', 'webkit']) {
  test(`${engine}: enlarged commerce rows retain whole words and compact image failures`, async () => {
    for (const [path, selector] of [
      ['/cart', '.cart-product-details a'],
      ['/orders', '.order-history-product > div > p:first-child'],
      ['/orders/fixture-order', '.order-item-copy h3'],
      ['/orders/fixture-order/tracking?shipment=1', '.order-item-copy h3'],
      ['/checkout', '.checkout-delivery > span:first-of-type > span:first-child'],
    ])
      await visit(engine, path, async (page) => {
        await page.setViewportSize({ width: 320, height: 950 })
        await page.evaluate(() => (document.documentElement.style.fontSize = '32px'))
        await page.setViewportSize({ width: 320, height: 951 })
        await page.setViewportSize({ width: 320, height: 950 })
        await expect(page.locator(selector).first()).toHaveCSS('font-size', '28px')
        const cramped = await page.locator(selector).evaluateAll((elements) =>
          elements.flatMap((element) => {
            const style = getComputedStyle(element),
              context = document.createElement('canvas').getContext('2d')
            context.font = [style.fontWeight, style.fontSize, style.fontFamily].join(' ')
            const longest = Math.max(
              ...element.textContent.split(/\s+/).map((word) => context.measureText(word).width)
            )
            return element.clientWidth + 1 < longest
              ? [{ width: element.clientWidth, longest }]
              : []
          })
        )
        assert.deepEqual(cramped, [], path)
        await page.route('**/unavailable-review.png', (route) => route.abort())
        await page
          .locator('main img')
          .evaluateAll((images) =>
            images.forEach((image) => (image.src = '/unavailable-review.png'))
          )
        const fallback = page.locator('main .store-image-fallback').first()
        await expect(fallback).toBeVisible()
        await expect(fallback).toHaveAttribute('aria-label', /image unavailable/i)
        await expect(fallback.locator('svg')).toBeVisible()
        assert.equal(
          await fallback.evaluate(
            (el) => el.scrollWidth <= el.clientWidth && el.scrollHeight <= el.clientHeight
          ),
          true
        )
      })
  })
  test(`${engine}: storefront uses the approved white and blue Inter system`, () =>
    visit(engine, '/profile', async (page) => {
      const design = await page.locator('.storefront-shell').evaluate((el) => {
        const style = getComputedStyle(el)
        return Object.fromEntries(
          [
            '--background',
            '--color-surface',
            '--color-primary',
            '--color-primary-hover',
            '--color-primary-soft',
            '--color-ink',
            '--color-muted',
            '--color-line',
            '--radius-card',
            '--radius-control',
          ].map((name) => [name, style.getPropertyValue(name).trim()])
        )
      })
      assert.deepEqual(design, {
        '--background': '#ffffff',
        '--color-surface': '#f7f8fc',
        '--color-primary': '#0070f3',
        '--color-primary-hover': '#005bcc',
        '--color-primary-soft': '#eaf3ff',
        '--color-ink': '#111827',
        '--color-muted': '#6b7280',
        '--color-line': '#e5e7eb',
        '--radius-card': '0.625rem',
        '--radius-control': '0.375rem',
      })
      await expect(page.locator('main h1')).toHaveText('Your account')
      assert.equal(
        await page.locator('main h1').evaluate((el) => getComputedStyle(el).fontSize),
        '28px'
      )
      assert.match(
        await page.locator('main h1').evaluate((el) => getComputedStyle(el).fontFamily),
        /^Inter/
      )
      await expect(page.locator('.account-initials')).toHaveCount(0)
      const identity = await page.locator('.account-identity').boundingBox()
      const rail = await page.locator('.account-sidebar').boundingBox()
      assert.ok(identity.y < rail.y)
      assert.equal(Math.round(rail.width), 200)
      for (const selector of ['.store-header', '.store-footer'])
        assert.equal(
          await page.locator(selector).evaluate((el) => getComputedStyle(el).backgroundColor),
          'rgb(255, 255, 255)'
        )
    }))
  test(`${engine}: compact cart aligns controls and keeps checkout visible in a desktop viewport`, () =>
    visit(engine, '/cart', async (page) => {
      const row = page.locator('.cart-product-row').first()
      await row.waitFor()
      const photo = await row.locator('.cart-product-image').boundingBox()
      const quantity = await row.getByRole('group', { name: /^Quantity for/ }).boundingBox()
      const total = await row.locator('.cart-product-total').boundingBox()
      assert.equal(photo.width, 80)
      assert.equal(photo.height, 80)
      await expect(row.locator('.cart-product-meta').first()).toHaveCSS('font-size', '12px')
      assert.ok(quantity.x > photo.x + photo.width)
      assert.ok(total.x > quantity.x + quantity.width)
      assert.ok(Math.abs(quantity.y + quantity.height / 2 - total.y - total.height / 2) < 2)
      const action = page.getByRole('button', { name: 'Proceed to Checkout', exact: true })
      const rect = await action.boundingBox()
      assert.ok(rect.y + rect.height <= 900, `Checkout ends at ${rect.y + rect.height}`)
      await expect(page.locator('.cart-page .journey-total')).toBeInViewport()
      await expect(
        page.locator('.cart-page').getByText('Continue shopping', { exact: true })
      ).toHaveCount(1)
    }))
  test(`${engine}: admin retains Manrope, semantic palette and geometry`, () =>
    visit(engine, '/admin', async (page) => {
      const design = await page
        .locator('.admin-theme')
        .first()
        .evaluate((el) => {
          const s = getComputedStyle(el)
          return {
            font: s.fontFamily,
            values: [
              '--background',
              '--color-primary',
              '--color-accent',
              '--color-accent-soft',
              '--color-info',
              '--color-info-soft',
              '--radius-control',
              '--radius-card',
              '--radius-image',
            ].map((key) => s.getPropertyValue(key).trim()),
          }
        })
      assert.match(design.font, /^Manrope/)
      assert.deepEqual(design.values, [
        '#f7f7f7',
        '#191919',
        '#326147',
        '#e8f8f0',
        '#386278',
        '#edf4fe',
        '0.5rem',
        '0.75rem',
        '0.75rem',
      ])
    }))
  test(`${engine}: quantity limits retain keyboard focus and correct reduced stock`, async () => {
    await visit(engine, '/cart?cartQuantity=2', async (page) => {
      await page.getByRole('button', { name: 'Decrease quantity', exact: true }).focus()
      await page.keyboard.press('Enter')
      await expect(page.locator('.quantity-control output')).toHaveText('1')
      await expect(
        page.getByRole('button', { name: 'Increase quantity', exact: true })
      ).toBeFocused()
    })
    await visit(engine, '/cart?slowQuantity=1', async (page) => {
      const increase = page.getByRole('button', { name: 'Increase quantity', exact: true })
      const decrease = page.getByRole('button', { name: 'Decrease quantity', exact: true })
      await increase.focus()
      await page.keyboard.press('Enter')
      await expect(page.locator('.quantity-control output')).toHaveText('2')
      await decrease.focus()
      await page.keyboard.press('Enter')
      await expect(page.locator('.quantity-control output')).toHaveText('1')
      await expect(increase).toBeFocused()
    })
    await visit(engine, '/cart?slowQuantity=1&cartQuantity=99&cartStock=101', async (page) => {
      const increase = page.getByRole('button', { name: 'Increase quantity', exact: true })
      await increase.focus()
      await page.keyboard.press('Enter')
      await expect(page.locator('.quantity-control output')).toHaveText('100')
      await expect(increase).toBeDisabled()
      await expect(
        page.getByRole('button', { name: 'Decrease quantity', exact: true })
      ).toBeFocused()
    })
    await visit(engine, '/cart?slowQuantity=1&cartQuantity=5&cartStock=2', async (page) => {
      await page.getByRole('button', { name: 'Reduce quantity to 2', exact: true }).click()
      await expect(page.locator('.quantity-control output')).toHaveText('2')
      await expect(
        page.getByRole('button', { name: 'Increase quantity', exact: true })
      ).toBeDisabled()
    })
  })
}
