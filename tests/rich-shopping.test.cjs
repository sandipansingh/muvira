const assert = require('node:assert/strict')
const { before, after, test } = require('node:test')
const { chromium } = require('playwright')
let browser, fixture
before(async () => {
  fixture = await (await import('./fixtures/editorial-server.mjs')).startEditorialServer()
  browser = await chromium.launch({ headless: true })
})
after(async () => {
  await browser?.close()
  await fixture?.server.close()
})
async function pageFor(path, run, width = 1440) {
  const page = await browser.newPage({ viewport: { width, height: 1000 }, reducedMotion: 'reduce' })
  page.setDefaultTimeout(5000)
  await page.route('**/*', (route) =>
    new URL(route.request().url()).origin === fixture.origin
      ? route.continue()
      : route.request().resourceType() === 'image'
        ? route.fulfill({
            path: 'client/public/images/editorial/stone-alcove.png',
            contentType: 'image/png',
          })
        : route.abort()
  )
  try {
    await page.goto(fixture.origin + path)
    await page.waitForFunction(() => window.fixtureReady)
    await run(page)
  } finally {
    await page.close()
  }
}
test('header exposes search and all active collections while respecting merchant navigation', () =>
  pageFor('/', async (page) => {
    await page
      .getByRole('searchbox', { name: 'Search products and collections', exact: true })
      .fill('Krishna')
    await page.getByRole('button', { name: 'Collections', exact: true }).click()
    const menu = page.getByRole('menu')
    await menu.waitFor()
    assert.equal(await menu.getByRole('menuitem').count(), 10)
    assert.equal(await menu.locator('img').count(), 9)
    const nav = page.getByRole('navigation', { name: 'Main navigation', exact: true })
    assert.equal(await nav.getByRole('link', { name: 'Vaastu', exact: true }).count(), 0)
    await page.keyboard.press('Escape')
    await page.getByRole('button', { name: 'Submit product search', exact: true }).click()
    assert.equal(new URL(page.url()).searchParams.get('q'), 'Krishna')
  }))
test('homepage uses every collection and keeps repeated merchandise sections visible', () =>
  pageFor('/', async (page) => {
    await page.locator('.category-mosaic a').last().waitFor()
    assert.equal(await page.locator('.category-mosaic a').count(), 9)
    assert.equal(await page.locator('.shopping-stage__tiles a').count(), 2)
    assert.ok((await page.locator('#featured-pieces article').count()) > 0)
    assert.ok((await page.locator('[aria-labelledby="new-arrivals-title"] article').count()) > 0)
    assert.equal(
      await page.getByRole('link', { name: 'Under ₹500', exact: true }).getAttribute('href'),
      '/shop?maxPrice=500'
    )
    assert.equal(
      await page
        .locator('#featured-pieces')
        .getByText(/reviews/i)
        .count(),
      0
    )
  }))
test('description specifications are recognized without changing original copy', () =>
  pageFor('/product/fixture', async (page) => {
    await page.getByRole('button', { name: 'Specifications', exact: true }).click()
    assert.equal(await page.getByRole('cell', { name: 'Premium Resin', exact: true }).count(), 1)
    assert.equal(await page.getByRole('cell', { name: '11 cm', exact: true }).count(), 1)
    await page.getByRole('button', { name: 'Description', exact: true }).click()
    assert.match(
      await page.locator('#product-detail-panel').innerText(),
      /Package Includes: 1 × Handcrafted Krishna Idol/
    )
  }))
test('desktop gallery selects a thumbnail and opens its original photograph', () =>
  pageFor('/product/fixture', async (page) => {
    const photos = page.locator('.gallery-thumbnail')
    await photos.first().waitFor()
    assert.equal(await photos.count(), 7)
    const source = await photos.nth(2).locator('img').getAttribute('src')
    await photos.nth(2).click()
    const main = page.getByRole('button', { name: /^Enlarge image of/ })
    await main.click()
    const dialog = page.getByRole('dialog')
    assert.equal(await dialog.locator('[data-lightbox-image]').getAttribute('src'), source)
    await page.keyboard.press('Escape')
    assert.equal(await main.evaluate((el) => document.activeElement === el), true)
  }))
test('mobile header keeps search visible and gallery shows its position', () =>
  pageFor(
    '/product/fixture',
    async (page) => {
      await page
        .getByRole('searchbox', { name: 'Search products and collections', exact: true })
        .waitFor()
      assert.equal(
        await page
          .getByRole('searchbox', { name: 'Search products and collections', exact: true })
          .isVisible(),
        true
      )
      await page
        .locator('.product-gallery')
        .getByRole('button', { name: 'Next image', exact: true })
        .click()
      assert.equal(await page.locator('.gallery-position').innerText(), '2 / 7')
      assert.equal(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
        true
      )
    },
    390
  ))
for (const count of [1, 2, 4, 10])
  test(`gallery preserves ${count} source photographs and opens the last one`, () =>
    pageFor(`/product/fixture?photos=${count}`, async (page) => {
      const photos = page.locator('.gallery-thumbnail')
      await page.locator('.gallery-stage img').waitFor()
      assert.equal(await photos.count(), count > 1 ? count : 0)
      await page
        .getByRole('button', {
          name: /^Enlarge image of/,
        })
        .click()
      const dialog = page.getByRole('dialog')
      await dialog.locator('[data-lightbox-image]').waitFor()
      for (let i = 1; i < count; i++)
        await dialog.getByRole('button', { name: 'Next image', exact: true }).click()
      if (count > 1)
        assert.equal(
          await dialog.locator('[aria-live="polite"]').innerText(),
          `${count} / ${count}`
        )
      else
        assert.equal(
          await dialog.getByRole('button', { name: 'Next image', exact: true }).count(),
          0
        )
    }))
test('tall purchase panels remain in document flow and fitting panels respect the header', () =>
  pageFor('/product/fixture', async (page) => {
    const panel = page.locator('.purchase-panel')
    await panel.waitFor()
    await page.setViewportSize({ width: 1440, height: 600 })
    await page.waitForFunction(
      () => getComputedStyle(document.querySelector('.purchase-panel')).position !== 'sticky'
    )
    await page.setViewportSize({ width: 1440, height: 1400 })
    await page.waitForFunction(
      () => getComputedStyle(document.querySelector('.purchase-panel')).position === 'sticky'
    )
    await page.evaluate(() => window.scrollTo({ top: 150, behavior: 'instant' }))
    await page.evaluate(() => new Promise(requestAnimationFrame))
    const p = await panel.boundingBox(),
      h = await page.locator('.store-header').boundingBox()
    const section = await page.locator('.product-detail-layout').boundingBox()
    assert.ok(
      p.y >= h.y + h.height || Math.abs(p.y + p.height - section.y - section.height) < 2,
      'The purchase panel clears the header until the product section ends'
    )
  }))
test('card actions stay below filled photographs on touch layouts', () =>
  pageFor(
    '/shop',
    async (page) => {
      const card = page.locator('.product-card').first()
      await card.waitFor()
      const image = await card.locator('.media-tile').boundingBox()
      const actions = await card.locator('.product-card__actions').boundingBox()
      assert.ok(actions.y >= image.y + image.height)
      assert.equal(
        await card.locator('img').evaluate((el) => getComputedStyle(el).objectFit),
        'cover'
      )
    },
    390
  ))
test('sparse catalog keeps genuine collection and overlapping merchandise discovery', () =>
  pageFor('/?scenario=sparse', async (page) => {
    await page.locator('.category-mosaic a').last().waitFor()
    assert.equal(await page.locator('.category-mosaic a').count(), 2)
    assert.equal(await page.locator('#featured-pieces article').count(), 1)
    assert.equal(await page.locator('.new-arrivals-collection article').count(), 1)
  }))
test('enlarged product and order content reflows at 320px', () =>
  pageFor(
    '/product/fixture',
    async (page) => {
      for (const path of ['/product/fixture', '/orders/fixture-order?shipment=1']) {
        await page.goto(fixture.origin + path)
        await page.locator('h1').waitFor()
        await page.evaluate(() => (document.documentElement.style.fontSize = '32px'))
        assert.equal(
          await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
          true,
          path
        )
      }
    },
    320
  ))
test('quick view waits for confirmed cart mutation and exposes a recoverable failure', () =>
  pageFor('/shop?slowAdd=1&addFailure=1', async (page) => {
    await page
      .getByRole('button', { name: /^Quick view / })
      .first()
      .click()
    const dialog = page.getByRole('dialog', { name: 'A closer look', exact: true })
    const add = dialog.getByRole('button', { name: 'Add to Cart', exact: true })
    await add.click()
    assert.equal(
      await dialog.getByRole('button', { name: 'Adding…', exact: true }).isDisabled(),
      true
    )
    await dialog.getByRole('alert').waitFor()
    assert.equal(await add.isEnabled(), true)
    assert.equal(await dialog.getByText('Added to Cart', { exact: true }).isVisible(), false)
  }))
test('empty modal search keeps focus inside the dialog', () =>
  pageFor('/', async (page) => {
    await page.getByRole('button', { name: 'Search products', exact: true }).click()
    const dialog = page.getByRole('dialog', { name: 'Find something meaningful' })
    await dialog.getByRole('button', { name: 'Search', exact: true }).click()
    assert.equal(
      await dialog.getByRole('searchbox').evaluate((el) => document.activeElement === el),
      true
    )
    await page.keyboard.type('Krishna')
    assert.equal(await dialog.getByRole('searchbox').inputValue(), 'Krishna')
  }))
for (const path of ['/shop', '/search?q=Krishna'])
  test(`results scrolling clears the measured header on ${path}`, () =>
    pageFor(
      path,
      async (page) => {
        const toolbar = page.locator('.catalog-topbar')
        await toolbar.waitFor()
        await toolbar.evaluate((el) =>
          el.closest('.layout-container').scrollIntoView({ behavior: 'instant', block: 'start' })
        )
        await page.evaluate(() => new Promise(requestAnimationFrame))
        const top = await toolbar.boundingBox(),
          header = await page.locator('.store-header').boundingBox()
        assert.ok(top.y >= header.y + header.height, 'Results controls are obscured by the header')
      },
      390
    ))
test('short collection links and compact account controls keep full touch targets', () =>
  pageFor(
    '/',
    async (page) => {
      const links = page
        .getByRole('navigation', { name: 'Footer collections', exact: true })
        .getByRole('link')
      await links.last().waitFor()
      for (const link of await links.all()) assert.ok((await link.boundingBox()).width >= 44)
      assert.ok(
        (
          await page
            .locator('.store-header')
            .getByRole('link', { name: 'My account', exact: true })
            .boundingBox()
        ).width >= 44
      )
      await page.setViewportSize({ width: 1024, height: 1000 })
      assert.ok(
        (
          await page
            .getByRole('navigation', { name: 'Main navigation', exact: true })
            .getByRole('link', { name: 'Shop all', exact: true })
            .boundingBox()
        ).width >= 44
      )
    },
    667
  ))

test('drawer prices and search prompts stay readable', () =>
  pageFor('/', async (page) => {
    await page.getByRole('button', { name: 'Shopping cart', exact: true }).click()
    const cart = page.getByRole('dialog', { name: 'Shopping cart', exact: true })
    const price = cart.getByText('₹499', { exact: true }).first()
    assert.ok(await price.evaluate((el) => parseFloat(getComputedStyle(el).fontSize) >= 14))
    await page.keyboard.press('Escape')
    await page.getByRole('button', { name: 'Search products', exact: true }).click()
    const search = page.getByRole('dialog', { name: 'Find something meaningful' })
    assert.ok(
      await search
        .getByText('Explore a collection', { exact: true })
        .evaluate((el) => parseFloat(getComputedStyle(el).fontSize) >= 14)
    )
  }))
